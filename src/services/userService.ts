
import api from './api';
import { supabase } from '@/integrations/supabase/client';
import { insertItems } from './supabaseUtils';

// Define profile data type for TypeScript
interface ProfileData {
  bloodGroup?: string;
  age?: number;
  preferredHospital?: string;
  healthIssues?: string[];
}

// Define booking data type
interface BookingData {
  name: string;
  address: string;
  age: number;
  ambulanceType: string;
  vehicleType: string;
  notes?: string;
  hospital?: string;
}

export const userService = {
  googleLogin: async (userData: {
    name: string;
    email: string;
    photoUrl?: string;
    token?: string;
  }) => {
    // In a real app, we would validate the token with the backend
    // For now, we'll just return the user data
    return { data: { token: userData.token || 'google-token', user: userData } };
  },

  getProfile: async () => {
    return api.get('/api/user/profile/');
  },

  updateProfile: async (profileData: ProfileData) => {
    // In a real app, we would send this to the backend
    // For now, we'll just return the updated profile data
    return { data: profileData };
  },

  bookRide: async (bookingData: BookingData) => {
    try {
      console.log('Booking data received:', bookingData);
      
      // Fixed charge of 5000 rupees for testing
      const charge = 5000;
      
      // Get current coordinates from localStorage if available, otherwise use placeholders
      let latitude = 0;
      let longitude = 0;
      
      // Try multiple keys for location data since there might be inconsistency
      const locationKeys = ['userLocation', 'currentLocation'];
      
      for (const key of locationKeys) {
        const locationData = localStorage.getItem(key);
        if (locationData) {
          try {
            const location = JSON.parse(locationData);
            latitude = location.lat || location.latitude || 0;
            longitude = location.lng || location.longitude || 0;
            console.log(`Found location data in ${key}:`, location);
            break; // Exit loop once valid location is found
          } catch (error) {
            console.warn(`Failed to parse location from ${key}:`, error);
          }
        }
      }
      
      console.log('Using coordinates:', { latitude, longitude });
      
      // Create a ride request object with all required fields
      const rideData = {
        name: bookingData.name,
        address: bookingData.address,
        age: bookingData.age,
        ambulance_type: bookingData.ambulanceType,
        vehicle_type: bookingData.vehicleType,
        notes: bookingData.notes || '',
        hospital: bookingData.hospital || 'Not specified',
        status: 'pending',
        charge: charge,
        latitude: latitude,
        longitude: longitude,
        created_at: new Date().toISOString()
      };
      
      console.log('Sending ride data to Supabase:', rideData);
      
      // Use Supabase client to insert data
      const { data, error } = await supabase
        .from('ride_requests')
        .insert(rideData)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting ride request to Supabase:', error);
        throw new Error(error.message || 'Failed to book ambulance');
      }
      
      if (!data) {
        throw new Error('No data returned from Supabase');
      }
      
      console.log('Booking successful, response:', data);
      
      // Save booking ID to localStorage for status tracking
      if (data.id) {
        localStorage.setItem('lastRideId', data.id);
      }
      
      // Generate a temporary user ID if one doesn't exist
      if (!localStorage.getItem('userId')) {
        const tempUserId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('userId', tempUserId);
      }
      
      return { data };
      
    } catch (error: any) {
      console.error('Error in bookRide:', error);
      
      // More detailed error message
      const errorMessage = error?.message || 'Network error occurred while booking ambulance';
      console.error('Error details:', errorMessage);
      
      // Return a structured error response instead of using the API fallback
      throw new Error(errorMessage);
    }
  },

  getRideStatus: async (rideId: string) => {
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          driver:driver_id(*)
        `)
        .eq('id', rideId)
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error getting ride status:', error);
      throw new Error(error.message || 'Failed to get ride status');
    }
  },

  logout: () => {
    localStorage.removeItem('user');
  }
};
