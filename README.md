# Ambuk - Emergency Ambulance Booking Platform

> A real-time emergency ambulance booking system with GPS tracking, driver management, and admin dashboard.

![Ambuk Logo](public/lovable-uploads/bac82e43-5e9b-40e3-a273-7c7fc5fa5b01.png)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [User Roles](#user-roles)
- [Core Modules](#core-modules)
- [API Services](#api-services)
- [Real-time Features](#real-time-features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Future Roadmap](#future-roadmap)

---

## Overview

**Ambuk** is a comprehensive emergency ambulance booking platform designed to reduce response times and improve patient outcomes. The system connects patients with ambulance drivers in real-time, providing GPS tracking, status updates, and seamless communication throughout the emergency response process.

### Problem Statement

- Emergency response delays cost lives
- Manual ambulance booking is time-consuming and error-prone
- Lack of real-time tracking creates uncertainty for patients
- No integrated communication between patients, drivers, and hospitals

### Solution

Ambuk provides an end-to-end digital platform that enables:
- Instant ambulance booking with location detection
- Real-time GPS tracking of ambulances
- Multi-role dashboards for users, drivers, and administrators
- Live status updates via WebSocket connections

---

## Features

### 👤 User Features
| Feature | Description |
|---------|-------------|
| **Google Login** | One-click authentication via Google OAuth |
| **Location Detection** | Automatic GPS location detection for pickup |
| **Address Search** | Google Maps Places Autocomplete integration |
| **Ambulance Booking** | Select ambulance type, vehicle type, and hospital |
| **Real-time Tracking** | Live driver location on interactive map |
| **Ride Status Updates** | Push notifications for ride status changes |
| **Profile Management** | Health profile with blood group, age, and medical conditions |
| **Booking History** | View past ride requests and details |

### 🚑 Driver Features
| Feature | Description |
|---------|-------------|
| **Secure Login** | Username/password authentication |
| **Ride Notifications** | Real-time notifications for new ride requests |
| **Ride Acceptance** | Accept/decline incoming ride requests |
| **Navigation** | View patient location on map |
| **Status Updates** | Update ride status (En Route, Picked Up, Completed) |
| **Location Sharing** | Share live location with patients |
| **Availability Toggle** | Set availability status |

### 🔧 Admin Features
| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview of all rides and drivers |
| **Driver Management** | Add, edit, delete driver accounts |
| **Ride Monitoring** | View all ride requests and their status |
| **Driver Credentials** | Manage driver login credentials |
| **Analytics** | View ride statistics and performance metrics |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **Tailwind CSS** | Utility-first Styling |
| **shadcn/ui** | Component Library |
| **React Router v6** | Client-side Routing |
| **TanStack Query** | Server State Management |
| **Lucide React** | Icon Library |
| **Sonner** | Toast Notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Database |
| **Supabase Realtime** | Real-time Subscriptions |
| **Django** | REST API (External) |
| **WebSocket** | Real-time Communication |

### Integrations
| Service | Purpose |
|---------|---------|
| **Google Maps API** | Maps, Geocoding, Places Autocomplete |
| **Google OAuth** | User Authentication |
| **Supabase Auth** | Driver/Admin Authentication |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Services                   │
│  - Index        │  - Navbar        │  - userService              │
│  - BookAmbulance│  - BookingModal  │  - driverService            │
│  - Profile      │  - RideStatus    │  - adminService             │
│  - Login        │  - ProfileForm   │  - websocketService         │
│  - AdminDashboard│ - GoogleLogin   │  - supabaseUtils            │
│  - DriverDashboard│                │                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Client        │  WebSocket Service                     │
│  - Database queries     │  - Real-time notifications             │
│  - Realtime subscriptions│ - Driver location updates             │
│  - Auth management      │  - Ride status updates                 │
└─────────────────────────┴───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  - drivers              - Driver information                     │
│  - driver_credentials   - Login credentials                      │
│  - ride_requests        - Booking and ride data                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `drivers` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | TEXT | Driver's full name |
| `username` | TEXT | Login username |
| `phone_number` | TEXT | Contact number |
| `license_number` | TEXT | Driving license number |
| `aadhaar_number` | TEXT | Aadhaar ID |
| `address` | TEXT | Residential address |
| `vehicle_number` | TEXT | Ambulance registration |
| `is_available` | BOOLEAN | Availability status |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `driver_credentials` Table
| Column | Type | Description |
|--------|------|-------------|
| `driver_id` | UUID | Foreign key to drivers |
| `password` | TEXT | Login password |

### `ride_requests` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | TEXT | Patient name |
| `age` | INTEGER | Patient age |
| `address` | TEXT | Pickup address |
| `latitude` | DOUBLE | Pickup latitude |
| `longitude` | DOUBLE | Pickup longitude |
| `ambulance_type` | TEXT | Basic/Advanced/ICU |
| `vehicle_type` | TEXT | Regular/Medium/Large |
| `hospital` | TEXT | Destination hospital |
| `notes` | TEXT | Special instructions |
| `status` | TEXT | pending/accepted/en_route/picked_up/completed |
| `charge` | INTEGER | Ride charge (default: 5000) |
| `driver_id` | UUID | Assigned driver |
| `driver_latitude` | DOUBLE | Driver's current latitude |
| `driver_longitude` | DOUBLE | Driver's current longitude |
| `created_at` | TIMESTAMP | Booking time |
| `updated_at` | TIMESTAMP | Last status update |

---

## User Roles

### 1. User (Patient/Requester)
- **Authentication**: Google OAuth
- **Access**: Public pages, Booking, Profile
- **Capabilities**: Book ambulance, track rides, manage profile

### 2. Driver
- **Authentication**: Username/Password via Supabase
- **Access**: Driver Dashboard
- **Capabilities**: Accept rides, update status, share location

### 3. Admin
- **Authentication**: Username/Password (admin/admin for demo)
- **Access**: Admin Dashboard
- **Capabilities**: Manage drivers, view all rides, system monitoring

---

## Core Modules

### 1. Authentication Module (`src/hooks/useAuth.tsx`)
```typescript
interface AuthContextType {
  user: any;
  login: (email: string, password: string, type: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  googleLogin: (userData: any) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}
```

### 2. Booking Module (`src/pages/BookAmbulance.tsx`)
- Google Maps integration for location selection
- Address search with Places Autocomplete
- Booking form with validation
- Real-time ride status modal

### 3. Driver Dashboard (`src/pages/driver/DriverDashboard.tsx`)
- Available ride requests list
- Ride acceptance workflow
- Status update controls
- Location sharing

### 4. Admin Dashboard (`src/pages/admin/AdminDashboard.tsx`)
- Driver management (CRUD operations)
- Ride monitoring
- System analytics

---

## API Services

### User Service (`src/services/userService.ts`)
```typescript
const userService = {
  googleLogin(userData): Promise<AuthResponse>
  getProfile(): Promise<ProfileData>
  updateProfile(profileData): Promise<ProfileData>
  bookRide(bookingData): Promise<RideResponse>
  getRideStatus(rideId): Promise<RideStatus>
  logout(): void
}
```

### Driver Service (`src/services/driverService.ts`)
```typescript
const driverService = {
  login(username, password): Promise<AuthResponse>
  logout(): void
  getDriverProfile(): Promise<DriverProfile>
  getRideRequests(): Promise<RideRequest[]>
  getCurrentRide(): Promise<RideRequest | null>
  acceptRide(rideId): Promise<AcceptResponse>
  updateRideStatus(rideId, status, location?): Promise<UpdateResponse>
}
```

### Admin Service (`src/services/adminService.ts`)
```typescript
const adminService = {
  login(credentials): Promise<AuthResponse>
  viewRides(): Promise<RideRequest[]>
  viewDrivers(): Promise<Driver[]>
  addDriver(driverData): Promise<Driver>
  updateDriver(driverData): Promise<UpdateResponse>
  deleteDriver(driverId): Promise<DeleteResponse>
  logout(): void
}
```

---

## Real-time Features

### WebSocket Service (`src/services/websocketService.ts`)

The application uses WebSocket connections for real-time communication:

```typescript
// WebSocket instances
export const userRideSocket = new WebSocketService('ws/user/ride-status');
export const driverNotificationsSocket = new WebSocketService('ws/driver/notifications');
```

**Features:**
- Automatic reconnection with exponential backoff
- Ping/pong heartbeat to keep connections alive
- Online/offline detection
- Message and status handlers

### Supabase Realtime

The app also uses Supabase Realtime for database change subscriptions:

```typescript
supabase
  .channel(`ride-updates-${rideId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ride_requests',
    filter: `id=eq.${rideId}`
  }, handleUpdate)
  .subscribe();
```

---

## Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Maps API key
- Google OAuth credentials

### Steps

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file with the required variables (see [Environment Variables](#environment-variables))

4. **Start development server**
```bash
npm run dev
```

5. **Access the application**
Open [http://localhost:5173](http://localhost:5173) in your browser

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

**Note:** Google Maps API key should be added to `index.html` or loaded dynamically.

---

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin-specific components
│   ├── ui/              # shadcn/ui components
│   ├── BookingModal.tsx # Ambulance booking form
│   ├── Footer.tsx       # Site footer
│   ├── GoogleLogin.tsx  # Google OAuth button
│   ├── Navbar.tsx       # Navigation bar
│   ├── ProfileForm.tsx  # User profile form
│   ├── ProtectedRoute.tsx # Route guard
│   ├── RideStatusModal.tsx # Ride tracking modal
│   └── ThemeToggle.tsx  # Dark/light mode toggle
├── hooks/
│   ├── useAuth.tsx      # Authentication hook
│   ├── use-mobile.tsx   # Mobile detection hook
│   └── use-toast.ts     # Toast notification hook
├── integrations/
│   └── supabase/        # Supabase client configuration
├── pages/
│   ├── admin/           # Admin pages
│   ├── driver/          # Driver pages
│   ├── About.tsx        # About page
│   ├── BookAmbulance.tsx # Booking page with map
│   ├── Contact.tsx      # Contact page
│   ├── Index.tsx        # Landing page
│   ├── Login.tsx        # User login
│   ├── NotFound.tsx     # 404 page
│   └── Profile.tsx      # User profile
├── providers/
│   └── ThemeProvider.tsx # Theme context
├── services/
│   ├── adminService.ts  # Admin API calls
│   ├── api.ts           # Axios instance
│   ├── driverService.ts # Driver API calls
│   ├── supabaseUtils.ts # Supabase helpers
│   ├── userService.ts   # User API calls
│   └── websocketService.ts # WebSocket client
└── App.tsx              # Main app component
```

---

## Deployment

### Using Lovable
1. Open [Lovable](https://lovable.dev/projects/16f5dfed-a4ee-4ba5-a72f-179897d969e3)
2. Click **Share → Publish**
3. Your app will be deployed to a `.lovable.app` subdomain

### Custom Domain
1. Navigate to **Project → Settings → Domains**
2. Click **Connect Domain**
3. Follow DNS configuration instructions

---

## Future Roadmap

### Phase 1 - Enhanced Features
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] SMS notifications for ride updates
- [ ] Multi-language support
- [ ] Ride fare estimation

### Phase 2 - Mobile Apps
- [ ] React Native mobile app for patients
- [ ] Driver mobile app with navigation
- [ ] Push notifications

### Phase 3 - AI & Analytics
- [ ] AI-powered demand prediction
- [ ] Route optimization
- [ ] Driver performance analytics
- [ ] Hospital integration API

### Phase 4 - Scale & Security
- [ ] HIPAA compliance
- [ ] Multi-tenant architecture
- [ ] Load balancing
- [ ] Disaster recovery

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Contact

For support or inquiries, please contact the development team.

---

**Built with ❤️ using [Lovable](https://lovable.dev)**
