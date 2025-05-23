import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { driverService } from '@/services/driverService';
import { Bell, Clock, MapPin, Calendar, User, DollarSign, Building, Check, Navigation } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { driverNotificationsSocket } from '@/services/websocketService';
import { supabase } from '@/integrations/supabase/client';

interface RideRequest {
  id: string;
  name: string;
  address: string;
  age: number;
  ambulance_type: string;
  vehicle_type: string;
  notes?: string;
  created_at: string;
  status: string;
  hospital: string;
  charge: number;
  latitude?: number;
  longitude?: number;
}

const POLLING_INTERVAL = 5000; // 5 seconds

const DriverDashboard = () => {
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [acceptingRide, setAcceptingRide] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationTracking, setLocationTracking] = useState<boolean>(false);
  const [locationInterval, setLocationInterval] = useState<number | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Function to fetch data
  const fetchData = useCallback(async () => {
    try {
      if (loading) setLoading(true);
      
      // Get driver profile
      const profileResponse = await driverService.getDriverProfile();
      setDriverProfile(profileResponse.data);
      
      // Check for current ride first
      const currentRideResponse = await driverService.getCurrentRide();
      if (currentRideResponse.data) {
        setCurrentRide(currentRideResponse.data);
        setRideRequests([]);
      } else {
        // Only get available rides if driver has no active ride
        const rideResponse = await driverService.getRideRequests();
        setRideRequests(rideResponse.data);
        setCurrentRide(null);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Function to start location tracking
  const startLocationTracking = useCallback(() => {
    if (locationTracking || !currentRide) return;
    
    console.log('Starting driver location tracking...');
    
    // Start tracking location
    const intervalId = window.setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            console.log('Driver location updated:', { latitude, longitude });
            
            try {
              // Update location in the ride_requests table
              const { error } = await supabase
                .from('ride_requests')
                .update({
                  driver_latitude: latitude,
                  driver_longitude: longitude,
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentRide.id)
                .eq('driver_id', driverProfile?.id);
                
              if (error) {
                console.error('Error updating driver location:', error);
              }
            } catch (err) {
              console.error('Failed to update location:', err);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            if (error.code === 1) { // Permission denied
              toast.error('Location permission denied. Please enable location services.');
              stopLocationTracking();
            }
          }
        );
      } else {
        toast.error('Geolocation is not supported by this browser.');
        stopLocationTracking();
      }
    }, 10000); // Update every 10 seconds
    
    setLocationInterval(intervalId);
    setLocationTracking(true);
    toast.success('Location tracking started');
  }, [currentRide, locationTracking, driverProfile]);
  
  // Function to stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationInterval) {
      window.clearInterval(locationInterval);
      setLocationInterval(null);
      setLocationTracking(false);
      console.log('Location tracking stopped');
    }
  }, [locationInterval]);
  
  // Start/stop location tracking when ride status changes
  useEffect(() => {
    if (currentRide) {
      if (['accepted', 'en_route', 'picked_up'].includes(currentRide.status)) {
        startLocationTracking();
      } else {
        stopLocationTracking();
      }
    } else {
      stopLocationTracking();
    }
    
    return () => {
      stopLocationTracking();
    };
  }, [currentRide, startLocationTracking, stopLocationTracking]);

  // Setup WebSocket listener for real-time ride notifications
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    // Connect to WebSocket
    const wsConnection = driverNotificationsSocket;
    wsConnection.connect(userId);
    
    // Handler for new ride requests
    const handleRideNotification = (message: any) => {
      if (message.type === 'new_ride_request') {
        console.log('New ride request received:', message.ride);
        
        // Only update if we don't have a current ride
        if (!currentRide) {
          // Check if this ride is already in our list
          setRideRequests(prev => {
            const exists = prev.some(ride => ride.id === message.ride.id);
            if (!exists) {
              toast.info('New ride request received!');
              return [...prev, message.ride];
            }
            return prev;
          });
        }
      } else if (message.type === 'ride_cancelled') {
        // Remove cancelled ride from requests
        console.log('Ride cancelled:', message.ride_id);
        setRideRequests(prev => prev.filter(ride => ride.id !== message.ride_id));
        
        // If it was our current ride, clear it
        if (currentRide && currentRide.id === message.ride_id) {
          toast.info('Current ride was cancelled by the user');
          setCurrentRide(null);
        }
      }
    };
    
    wsConnection.addMessageHandler(handleRideNotification);
    
    // Status handler for WebSocket connection
    const handleStatus = (status: string) => {
      console.log('WebSocket status:', status);
      if (status === 'error' || status === 'disconnected') {
        // If WebSocket fails, fall back to polling
        console.log('WebSocket disconnected, falling back to polling');
      }
    };
    
    wsConnection.addStatusHandler(handleStatus);
    
    return () => {
      wsConnection.removeMessageHandler(handleRideNotification);
      wsConnection.removeStatusHandler(handleStatus);
    };
  }, [currentRide]);

  // Initial load and polling fallback
  useEffect(() => {
    fetchData();
    
    // Set up polling interval as fallback
    const interval = setInterval(() => {
      fetchData();
    }, POLLING_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check if user is authenticated as driver
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'driver') {
      navigate('/driver/login');
    }
  }, [navigate]);

  // Handle accepting a ride - now with better error handling
  const handleAcceptRide = async (rideId: string) => {
    try {
      setAcceptingRide(rideId);
      setError(null);
      toast.loading('Accepting ride...');
      
      const result = await driverService.acceptRide(rideId);
      
      if (result.success) {
        toast.dismiss();
        toast.success('Ride accepted successfully!');
        
        // Update local state
        setCurrentRide(result.data.ride);
        setRideRequests([]);
      } else {
        toast.dismiss();
        toast.error(result.error || 'Failed to accept ride');
        setError(result.error || 'Failed to accept ride');
        
        // Refresh ride requests in case this one is no longer available
        fetchData();
      }
    } catch (error: any) {
      console.error('Error in handleAcceptRide:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to accept ride');
      setError(error.message || 'Failed to accept ride');
    } finally {
      setAcceptingRide(null);
    }
  };
  
  // Handle updating ride status
  const handleUpdateRideStatus = async (status: string) => {
    if (!currentRide) return;
    
    try {
      toast.loading(`Updating ride status...`);
      
      // Get current position if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            
            const result = await driverService.updateRideStatus(currentRide.id, status, location);
            
            handleStatusUpdateResult(result, status);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fall back to updating without location
            updateWithoutLocation(status);
          },
          { timeout: 5000 } // Short timeout to avoid long waits
        );
      } else {
        // Update without location if geolocation is not available
        updateWithoutLocation(status);
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to update ride status');
      setError(error.message || 'Failed to update ride status');
    }
  };
  
  // Helper function to update without location
  const updateWithoutLocation = async (status: string) => {
    if (!currentRide) return;
    
    const result = await driverService.updateRideStatus(currentRide.id, status);
    handleStatusUpdateResult(result, status);
  };
  
  // Helper function to handle status update results
  const handleStatusUpdateResult = (result: any, status: string) => {
    if (result.success) {
      toast.dismiss();
      if (status === 'en_route') {
        toast.success('Status updated: On the way to pickup');
      } else if (status === 'picked_up') {
        toast.success('Status updated: Patient picked up');
      } else if (status === 'completed') {
        toast.success('Ride completed successfully!');
        // Clear current ride and fetch new requests
        setCurrentRide(null);
        fetchData();
      }
      
      // Update current ride state if not completed
      if (status !== 'completed' && currentRide) {
        setCurrentRide({
          ...currentRide,
          status
        });
      }
    } else {
      toast.dismiss();
      toast.error(result.error || 'Failed to update status');
      setError(result.error || 'Failed to update status');
    }
  };

  const handleManualRefresh = () => {
    fetchData();
    toast.info('Refreshing ride requests...');
  };

  const handleLogout = () => {
    driverService.logout();
    logout();
    navigate('/driver/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow py-24 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Driver Dashboard</h1>
                {driverProfile && (
                  <p className="text-gray-600">Welcome, {driverProfile.name}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!currentRide && (
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2" 
                    onClick={handleManualRefresh}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2" 
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
            
            {/* Error message display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
                <p className="font-medium">Error: {error}</p>
                <p className="text-xs mt-1">If this persists, please try refreshing the page.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchData} 
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {/* Driver Information */}
            {driverProfile && (
              <div className="mb-8 p-4 border rounded-lg bg-gray-50">
                <h2 className="text-lg font-semibold mb-3">Driver Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{driverProfile.username}</p>
                  </div>
                  
                  {driverProfile.phone_number && (
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{driverProfile.phone_number}</p>
                    </div>
                  )}
                  {driverProfile.vehicle_number && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Number</p>
                      <p className="font-medium">{driverProfile.vehicle_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Current Ride (if any) */}
            {currentRide && (
              <div className="mb-8">
                <h2 className="flex items-center text-xl font-semibold mb-4">
                  <Bell className="mr-2 h-5 w-5" />
                  Current Ride
                </h2>
                
                <div className="border rounded-lg p-5 shadow-sm bg-blue-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-lg flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {currentRide.name}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {currentRide.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{currentRide.address}</span>
                    </p>
                    {currentRide.hospital && (
                      <p className="flex items-center">
                        <Building className="w-4 h-4 mr-2" />
                        <span>Hospital: {currentRide.hospital}</span>
                      </p>
                    )}
                    <p className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span className="font-medium">₹{currentRide.charge?.toLocaleString()}</span>
                    </p>
                    
                    <div>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Ambulance Type:</span> {currentRide.ambulance_type}
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Patient Age:</span> {currentRide.age}
                      </p>
                      {currentRide.notes && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Notes:</span> {currentRide.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {currentRide.status === 'accepted' && (
                      <Button
                        onClick={() => handleUpdateRideStatus('en_route')}
                        className="flex items-center gap-2 flex-grow"
                      >
                        <Navigation className="h-4 w-4" />
                        Start Journey
                      </Button>
                    )}
                    
                    {currentRide.status === 'en_route' && (
                      <Button
                        onClick={() => handleUpdateRideStatus('picked_up')}
                        className="flex items-center gap-2 flex-grow"
                      >
                        <Check className="h-4 w-4" />
                        Patient Picked Up
                      </Button>
                    )}
                    
                    {currentRide.status === 'picked_up' && (
                      <Button
                        onClick={() => handleUpdateRideStatus('completed')}
                        className="flex items-center gap-2 flex-grow"
                      >
                        <Check className="h-4 w-4" />
                        Complete Ride
                      </Button>
                    )}
                    
                    {/* Call button for all statuses */}
                    <Button
                      variant="outline"
                      onClick={() => window.open(`tel:${currentRide.phone || '911'}`)}
                      className="flex items-center gap-2"
                    >
                      Call Patient
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ride Requests (only show if no current ride) */}
            {!currentRide && (
              <div className="mb-8">
                <h2 className="flex items-center text-xl font-semibold mb-4">
                  <Bell className="mr-2 h-5 w-5" />
                  New Ride Requests
                </h2>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : rideRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rideRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-lg flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {request.name}
                          </h3>
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            {request.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p className="flex items-start">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{request.address}</span>
                          </p>
                          <p className="flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            <span>Hospital: {request.hospital}</span>
                          </p>
                          <p className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          </p>
                          <p className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{new Date(request.created_at).toLocaleTimeString()}</span>
                          </p>
                          <p className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span className="font-medium">₹{request.charge?.toLocaleString()}</span>
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm mb-1">
                            <span className="font-medium">Ambulance Type:</span> {request.ambulance_type}
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">Vehicle Type:</span> {request.vehicle_type}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Age:</span> {request.age}
                          </p>
                          {request.notes && (
                            <p className="text-sm mt-2">
                              <span className="font-medium">Notes:</span> {request.notes}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          className="w-full mt-4 gradient-bg btn-animate"
                          onClick={() => handleAcceptRide(request.id)}
                          disabled={acceptingRide === request.id}
                        >
                          {acceptingRide === request.id ? (
                            <span className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Processing...
                            </span>
                          ) : (
                            `Accept Ride (₹${request.charge?.toLocaleString()})`
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No new ride requests available at the moment.</p>
                    <p className="text-gray-500 text-sm mt-2">New requests will appear here automatically.</p>
                    <Button 
                      onClick={handleManualRefresh} 
                      variant="outline" 
                      className="mt-4"
                      disabled={loading}
                    >
                      {loading ? 'Refreshing...' : 'Refresh Now'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DriverDashboard;
