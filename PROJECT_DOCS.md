# Herd Tracker v2 - Project Documentation

A real-time GPS location tracking application built with **Nuxt 4 (Vue 3)**, **Prisma**, **PostgreSQL**, and **Socket.IO**. Users can register devices (mobile/laptop), track live GPS locations, view history, and see real-time updates on an interactive map.

---

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Frontend    | Nuxt 4.3.1 (Vue 3), TypeScript     |
| State       | Pinia 3.0.4                         |
| Real-time   | Socket.IO 4.8.3                     |
| Maps        | Leaflet 1.9.4 + OpenStreetMap       |
| Backend     | Nitro (Nuxt server engine)          |
| Database    | PostgreSQL via Prisma 6.19.2        |
| Auth        | JWT (jsonwebtoken) + bcryptjs       |
| Rendering   | Client-side SPA (SSR disabled)      |

---

## Folder Structure

```
herd-tracker-v2/
├── app.vue                        # Root app component
├── nuxt.config.ts                 # Nuxt configuration
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
├── .env                           # Environment variables
│
├── prisma/
│   └── schema.prisma              # Database schema (User, Device, Location, TrackingSession)
│
├── assets/
│   └── css/
│       └── main.css               # Global styles, dark theme, component styles
│
├── layouts/
│   └── default.vue                # App shell: navbar, navigation links, logout
│
├── pages/                         # Auto-routed page components
│   ├── index.vue                  # Login / Register page
│   ├── dashboard.vue              # Live map with real-time device locations
│   ├── track.vue                  # Start/stop GPS tracking interface
│   ├── devices.vue                # Device management (add, edit, delete)
│   └── history.vue                # Location history & session analytics
│
├── stores/                        # Pinia state management
│   ├── auth.ts                    # Auth state, user, token, device CRUD
│   └── tracking.ts                # Tracking state, geolocation, location sending
│
├── composables/                   # Reusable Vue composition functions
│   ├── useAuth.ts                 # Auth helper with authFetch()
│   ├── useGeolocation.ts          # Browser Geolocation API wrapper
│   └── useSocket.ts               # Socket.IO client singleton
│
├── middleware/                     # Client-side route guards
│   └── auth.ts                    # Redirect unauthenticated users to login
│
├── plugins/                       # Nuxt plugins (client-side)
│   ├── 00.auth.client.ts          # Load auth from localStorage on app init
│   └── tracking.client.ts         # Initialize Socket.IO connection
│
├── server/                        # Backend (Nitro server)
│   ├── api/                       # REST API endpoints
│   │   ├── auth/
│   │   │   ├── login.post.ts      # POST /api/auth/login
│   │   │   └── register.post.ts   # POST /api/auth/register
│   │   ├── device/
│   │   │   ├── index.post.ts      # POST /api/device (create)
│   │   │   ├── [id].put.ts        # PUT /api/device/:id (update)
│   │   │   └── [id].delete.ts     # DELETE /api/device/:id
│   │   ├── devices.get.ts         # GET /api/devices (list all)
│   │   ├── location/
│   │   │   ├── index.post.ts      # POST /api/location (save point)
│   │   │   ├── latest/
│   │   │   │   └── [userId].get.ts # GET /api/location/latest/:userId
│   │   │   └── history/
│   │   │       └── [userId].get.ts # GET /api/location/history/:userId
│   │   ├── session/
│   │   │   ├── start.post.ts      # POST /api/session/start
│   │   │   ├── [id].get.ts        # GET /api/session/:id
│   │   │   ├── [id].delete.ts     # DELETE /api/session/:id
│   │   │   └── [id]/
│   │   │       └── stop.post.ts   # POST /api/session/:id/stop
│   │   ├── sessions.get.ts        # GET /api/sessions (list all)
│   │   └── health.get.ts          # GET /api/health
│   ├── middleware/
│   │   └── auth.ts                # JWT verification middleware
│   ├── plugins/
│   │   └── socket.ts              # Socket.IO server setup
│   └── utils/
│       ├── jwt.ts                 # signToken() / verifyToken()
│       ├── prisma.ts              # Prisma client singleton
│       └── haversine.ts           # Distance calculation between coordinates
│
└── public/                        # Static files served at root
```

---

## File-by-File Explanation

### Root Files

| File | Purpose |
| ---- | ------- |
| `app.vue` | Root Vue component. Wraps the app in `<NuxtLayout>` and `<NuxtPage>` |
| `nuxt.config.ts` | Nuxt settings: SSR disabled, CSS imports, Leaflet CDN, JWT secret runtime config, Pinia module |
| `package.json` | Project metadata, dependencies (prisma, socket.io, leaflet, bcryptjs, jsonwebtoken, pinia) |
| `tsconfig.json` | Extends Nuxt-generated TS config |
| `.env` | Environment variables (DATABASE_URL, JWT_SECRET) |

---

### `prisma/schema.prisma`

Defines 4 models and 2 enums:

| Model | Key Fields | Purpose |
| ----- | ---------- | ------- |
| **User** | id, name, email, password | Registered users |
| **Device** | id, userId, deviceType (mobile/laptop), imei, identifier, name, isActive | User's tracked devices |
| **Location** | id, userId, deviceId, sessionId, lat, lng, accuracy, speed, heading, altitude, batteryLevel, timestamp | Individual GPS data points |
| **TrackingSession** | id, userId, deviceId, status (active/stopped), startedAt, stoppedAt, duration, totalDistance, pointCount | Tracking session metadata |

**Indexes** optimized for: user+timestamp lookups, device+timestamp lookups, session+timestamp ordering.

---

### `pages/` — Frontend Pages

#### `index.vue` — Auth Page (route: `/`)
- Tab-based login/register form
- Calls `/api/auth/login` or `/api/auth/register`
- Stores JWT token and user in localStorage via Pinia
- Auto-redirects to `/dashboard` if already authenticated

#### `dashboard.vue` — Live Map (route: `/dashboard`)
- Full-screen Leaflet map with OpenStreetMap tiles
- Shows all user devices as color-coded markers
- Connects to Socket.IO for real-time location updates
- Sidebar with device list, current coordinates, accuracy display
- Auto-pans map to updated device locations

#### `track.vue` — GPS Tracking (route: `/track`)
- Start/Stop tracking buttons
- Uses browser `navigator.geolocation.watchPosition()`
- Sends location to server every 15 seconds
- Shows: session duration, points recorded, distance traveled
- Mini map preview of current position
- Device selector dropdown

#### `devices.vue` — Device Management (route: `/devices`)
- Add new device form (type: mobile with IMEI or laptop with identifier)
- Device list with edit/delete/toggle active functionality
- Shows device type, status, last seen timestamp

#### `history.vue` — Location History (route: `/history`)
- Two view modes: **Sessions** (grouped) and **All Points** (flat list)
- Date range and device filters
- Interactive map with polyline routes
- Start (green) and end (red) markers
- Session cards: duration, distance, point count
- Points table: speed, accuracy, coordinates, timestamp

---

### `stores/` — State Management

#### `auth.ts`
- **State**: `user`, `token`, `devices`, `selectedDeviceId`
- **Actions**: `register()`, `login()`, `logout()`, `loadFromStorage()`
- **Device CRUD**: `fetchDevices()`, `registerDevice()`, `updateDevice()`, `removeDevice()`
- **Getter**: `isLoggedIn`, `selectedDevice`
- Persists token/user to localStorage

#### `tracking.ts`
- **State**: `isTracking`, `location`, `currentSession`, `pointCount`, `sessionDistance`, `sessionElapsed`
- **Actions**: `startTracking()`, `stopTracking()`, `_sendLocation()`
- Uses Geolocation API with `watchPosition()`
- Sends location every 15 seconds via REST + emits via Socket.IO
- Calculates cumulative distance using Haversine formula
- Persists tracking state for session recovery

---

### `composables/` — Reusable Logic

| File | Exports | Purpose |
| ---- | ------- | ------- |
| `useAuth.ts` | `store`, `authFetch()` | Provides auth store + fetch wrapper that injects `Authorization: Bearer` header |
| `useGeolocation.ts` | `location`, `error`, `isTracking`, `startTracking()`, `stopTracking()` | Wraps browser Geolocation API with error handling |
| `useSocket.ts` | `connect()`, `disconnect()`, `emit()`, `on()`, `off()`, `isConnected` | Singleton Socket.IO client, persists across navigation |

---

### `middleware/auth.ts` — Route Guard

- Runs on every client-side navigation
- Skips protection for `/` (login page)
- Redirects to `/` if user is not logged in

---

### `plugins/` — App Initialization

| File | Purpose |
| ---- | ------- |
| `00.auth.client.ts` | Loads auth state from localStorage before route guards execute (prefix `00.` ensures it runs first) |
| `tracking.client.ts` | Initializes Socket.IO connection on app load |

---

### `server/api/` — REST Endpoints

#### Auth (`/api/auth/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/auth/register` | POST | No | Create user account (hashes password with bcryptjs, 12 rounds) |
| `/api/auth/login` | POST | No | Authenticate user, returns JWT token |

#### Devices (`/api/device/`, `/api/devices`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/devices` | GET | Yes | List all devices for authenticated user |
| `/api/device` | POST | Yes | Register new device (mobile: IMEI, laptop: identifier) |
| `/api/device/:id` | PUT | Yes | Update device name or active status |
| `/api/device/:id` | DELETE | Yes | Delete a device |

#### Location (`/api/location/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/location` | POST | Yes | Save a GPS location point |
| `/api/location/latest/:userId` | GET | Yes | Get most recent location for a user |
| `/api/location/history/:userId` | GET | Yes | Get location history (supports date range & device filters) |

#### Sessions (`/api/session/`, `/api/sessions`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/session/start` | POST | Yes | Create new tracking session |
| `/api/session/:id` | GET | Yes | Get session details with associated locations |
| `/api/session/:id/stop` | POST | Yes | End an active tracking session |
| `/api/session/:id` | DELETE | Yes | Delete a session |
| `/api/sessions` | GET | Yes | List all sessions (supports date filter) |

#### Health

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/health` | GET | No | Health check |

---

### `server/middleware/auth.ts`

- Reads `Authorization: Bearer <token>` from request headers
- Verifies JWT using `verifyToken()`
- Attaches decoded user to `event.context.user`
- Skips auth for `/api/auth/*` and `/api/health` routes

---

### `server/plugins/socket.ts`

- Initializes Socket.IO server on Nitro
- Authenticates WebSocket connections using JWT from handshake
- Joins users to user-specific rooms for targeted broadcasts
- Handles `location:update` events and broadcasts to user rooms

---

### `server/utils/` — Shared Utilities

| File | Exports | Purpose |
| ---- | ------- | ------- |
| `jwt.ts` | `signToken(payload)`, `verifyToken(token)` | JWT creation/verification using runtime config secret |
| `prisma.ts` | `prisma` | Singleton Prisma client instance |
| `haversine.ts` | `haversine(lat1, lon1, lat2, lon2)` | Calculates distance between two GPS coordinates in meters |

---

### `assets/css/main.css`

- CSS custom properties for theming (dark theme by default)
- Primary color: `#10b981` (emerald green)
- Background: `#0f172a` (dark navy)
- Card background: `#1e293b`
- Component styles: buttons, cards, forms, navigation, badges, tables
- Badge variants: success (green), danger (red)
- Map container styling
- Responsive breakpoints at 768px and 480px
- Animations: pulse effect for tracking status indicator

---

### `layouts/default.vue`

- App shell with top navigation bar
- Links: Dashboard, Track, Devices, History
- Logout button (calls `auth.logout()`, redirects to `/`)
- "Herd Tracker" branding with animated tracking pulse
- Navbar hidden on login page (shown only when `isLoggedIn`)

---

## Architecture Flows

### Authentication Flow
```
Register/Login → POST /api/auth/* → bcrypt hash → JWT signed → Token stored in localStorage
                                                                      ↓
All subsequent requests → Authorization: Bearer <token> → server/middleware/auth.ts → verifyToken()
                                                                      ↓
Socket.IO connection → JWT in handshake auth → server/plugins/socket.ts → verified → join user room
```

### Real-time Tracking Flow
```
User clicks "Start" → POST /api/session/start → Session created
        ↓
Browser watchPosition() → Every 15s → POST /api/location → Saved to DB
        ↓                                      ↓
        └──── Socket.IO emit("location:update") → Server broadcasts to user room
                                                          ↓
                                              Dashboard receives update → Map marker moves
```

### Data Flow
```
Browser Geolocation API → tracking store → REST API → Prisma → PostgreSQL
                              ↓
                         Socket.IO emit → Socket.IO server → Broadcast → Dashboard map
```

---

## Key Design Decisions

1. **SSR Disabled** — Runs as a client-side SPA since real-time tracking is inherently client-driven
2. **Dual Transport** — REST for persistence + Socket.IO for real-time broadcasts
3. **15-second intervals** — Balances accuracy with battery/bandwidth conservation
4. **Session-based tracking** — Groups location points into sessions for meaningful history
5. **Device abstraction** — Supports multiple device types per user (mobile via IMEI, laptop via identifier)
6. **Haversine distance** — Server-side and client-side distance calculations for session stats
7. **localStorage persistence** — Allows tracking recovery after page refresh
