# Herd Tracker — Architecture Documentation

Real-time GPS device tracking application built with Nuxt 4, Pinia, Socket.IO, Leaflet, and Prisma/PostgreSQL.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [Pinia Store Architecture](#pinia-store-architecture)
5. [Pages](#pages)
6. [Composables](#composables)
7. [Plugins & Middleware](#plugins--middleware)
8. [Server Architecture](#server-architecture)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Design System](#design-system)

---

## Tech Stack

| Layer              | Technology                        |
| ------------------ | --------------------------------- |
| Frontend Framework | Nuxt 4.3.1 (Vue 3, SPA mode)     |
| State Management   | Pinia 3.0.4 + @pinia/nuxt 0.11.3 |
| Real-time          | Socket.IO 4.8.3 (client + server)|
| Maps               | Leaflet 1.9.4                     |
| Server Engine      | Nitro (built into Nuxt)           |
| Database           | PostgreSQL + Prisma 6.19.2        |
| Authentication     | JWT (jsonwebtoken) + bcryptjs     |
| Language           | TypeScript 5.9.3                  |

---

## Project Structure

```
herd-tracker-nuxtfull/
├── app.vue                          # Root component (<NuxtLayout><NuxtPage /></NuxtLayout>)
├── nuxt.config.ts                   # SSR: false, port 4000, @pinia/nuxt module
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma                # Database models (User, Device, Location, TrackingSession)
│
├── assets/
│   └── css/main.css                 # Global styles, dark theme, responsive design
│
├── stores/                          # *** PINIA STORES — Central data layer ***
│   ├── auth.ts                      # User auth, devices, tokens, API wrapper
│   ├── tracking.ts                  # GPS tracking, geolocation, session management
│   ├── dashboard.ts                 # Live dashboard state, latest location
│   ├── history.ts                   # Historical sessions & location data
│   ├── devices-ui.ts                # Device management UI form state
│   └── socket.ts                    # Socket.IO connection state
│
├── pages/                           # Route pages (consume stores only)
│   ├── index.vue                    # Login / Register
│   ├── dashboard.vue                # Live map + device overview
│   ├── track.vue                    # GPS tracking controls
│   ├── devices.vue                  # Device CRUD management
│   └── history.vue                  # Historical routes & sessions
│
├── composables/                     # Reusable logic (thin wrappers)
│   ├── useAuth.ts                   # Convenience wrapper for useAuthStore()
│   ├── useSocket.ts                 # Singleton Socket.IO client manager
│   └── useGeolocation.ts            # Standalone geolocation API wrapper
│
├── layouts/
│   └── default.vue                  # Navbar, navigation links, logout
│
├── middleware/
│   └── auth.ts                      # Client-side route guard
│
├── plugins/
│   ├── 00.auth.client.ts            # Loads auth from localStorage before middleware
│   └── tracking.client.ts           # Connects socket + restores tracking on refresh
│
└── server/
    ├── middleware/
    │   └── auth.ts                  # JWT verification for API routes
    ├── plugins/
    │   └── socket.ts                # Socket.IO lazy init (hooks first request → socketServer.ts)
    ├── utils/
    │   ├── prisma.ts                # PrismaClient singleton
    │   ├── jwt.ts                   # signToken / verifyToken helpers
    │   ├── haversine.ts             # Distance calculation (meters)
    │   └── socketServer.ts          # Socket.IO server init (lazy, attached on first request)
    └── api/
        ├── auth/
        │   ├── login.post.ts        # POST /api/auth/login
        │   └── register.post.ts     # POST /api/auth/register
        ├── health.get.ts            # GET /api/health
        ├── devices.get.ts           # GET /api/devices
        ├── device.post.ts           # POST /api/device
        ├── device/
        │   └── [id].put.ts          # PUT /api/device/:id
        │   └── [id].delete.ts       # DELETE /api/device/:id
        ├── location.post.ts         # POST /api/location
        ├── location/
        │   ├── latest/[userId].get.ts   # GET /api/location/latest/:userId
        │   └── history/[userId].get.ts  # GET /api/location/history/:userId
        ├── session/
        │   ├── start.post.ts        # POST /api/session/start
        │   ├── active.get.ts        # GET /api/session/active
        │   ├── [id].get.ts          # GET /api/session/:id
        │   └── [id]/stop.post.ts    # POST /api/session/:id/stop
        └── sessions.get.ts          # GET /api/sessions
```

---

## Database Schema

### Entity Relationship

```
User (1) ──── (N) Device
  │                  │
  │                  │
  (N)               (N)
Location ────── TrackingSession
  │                  │
  └──────────────────┘
    (Location belongs to Session)
```

### Models

#### User
| Field     | Type     | Notes              |
| --------- | -------- | ------------------ |
| id        | UUID     | Primary key        |
| name      | String   |                    |
| email     | String   | Unique             |
| password  | String   | bcrypt hashed      |
| createdAt | DateTime | Auto               |

#### Device
| Field      | Type       | Notes                         |
| ---------- | ---------- | ----------------------------- |
| id         | UUID       | Primary key                   |
| userId     | String     | FK → User                     |
| deviceType | Enum       | `mobile` \| `laptop`          |
| imei       | String?    | Unique, for mobile devices    |
| identifier | String?    | Unique, for laptop devices    |
| name       | String     | Default: "My Device"          |
| isActive   | Boolean    | Default: true                 |
| lastSeen   | DateTime?  | Updated on location receive   |

**Indexes:** `[userId]`

#### Location
| Field        | Type      | Notes                    |
| ------------ | --------- | ------------------------ |
| id           | UUID      | Primary key              |
| userId       | String    | FK → User                |
| deviceId     | String?   | FK → Device              |
| sessionId    | String?   | FK → TrackingSession     |
| latitude     | Float     |                          |
| longitude    | Float     |                          |
| accuracy     | Float     | Default: 0              |
| speed        | Float?    | m/s                      |
| heading      | Float?    | Degrees                  |
| altitude     | Float?    | Meters                   |
| batteryLevel | Float?    | Percentage               |
| timestamp    | DateTime  | Auto                     |

**Indexes:** `[userId, timestamp DESC]`, `[deviceId, timestamp DESC]`, `[sessionId, timestamp]`

#### TrackingSession
| Field          | Type          | Notes                      |
| -------------- | ------------- | -------------------------- |
| id             | UUID          | Primary key                |
| userId         | String        | FK → User                  |
| deviceId       | String?       | FK → Device                |
| imei           | String?       | Snapshot at session start   |
| deviceName     | String        | Default: "Unknown Device"  |
| status         | Enum          | `active` \| `stopped`      |
| startedAt      | DateTime      | Auto                       |
| stoppedAt      | DateTime?     | Set on stop                |
| duration       | Int           | Seconds, calculated on stop|
| totalDistance   | Float         | Meters, haversine sum      |
| pointCount     | Int           | Location count             |
| startLatitude  | Float?        |                            |
| startLongitude | Float?        |                            |
| lastLatitude   | Float?        |                            |
| lastLongitude  | Float?        |                            |

**Indexes:** `[userId, startedAt DESC]`, `[deviceId, startedAt DESC]`

---

## Pinia Store Architecture

All application data flows through Pinia stores. **Pages never make direct API calls** — they consume store state and invoke store actions.

### Store Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                        PAGES                            │
│  index.vue  dashboard.vue  track.vue  devices.vue  history.vue │
└────┬──────────┬───────────┬──────────┬──────────┬───────┘
     │          │           │          │          │
     ▼          ▼           ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
│  auth   │ │dashboard │ │ tracking │ │devices-ui│ │ history │
│  store  │ │  store   │ │  store   │ │  store   │ │  store  │
└────┬────┘ └────┬─────┘ └────┬─────┘ └──────────┘ └────┬────┘
     │           │            │                          │
     │      Uses auth.       Uses auth.             Uses auth.
     │      authFetch()      token & devices        authFetch()
     │           │            │                          │
     ▼           ▼            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                   auth store                            │
│  (Central: user, token, devices, authFetch)             │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                  Server API (/api/*)                     │
└─────────────────────────────────────────────────────────┘

┌──────────┐
│  socket  │  ← useSocket() composable updates this
│  store   │  ← dashboard.vue reads isConnected
└──────────┘
```

### Store Details

#### `stores/auth.ts` — Authentication & Device Registry

**Role:** Central store. Holds user identity, JWT token, device list. Provides `authFetch()` used by other stores.

| State             | Type                        | Purpose                          |
| ----------------- | --------------------------- | -------------------------------- |
| user              | `User \| null`              | Current authenticated user       |
| token             | `string \| null`            | JWT token                        |
| devices           | `Device[]`                  | User's registered devices        |
| selectedDeviceId  | `string \| null`            | Currently selected device        |
| authFormMode      | `'login' \| 'register'`     | Auth page tab state              |
| authFormLoading   | `boolean`                   | Form submission loading          |
| authFormError     | `string`                    | Form error message               |
| authForm          | `{ name, email, password }` | Form field values                |

| Getter          | Returns          | Logic                               |
| --------------- | ---------------- | ------------------------------------ |
| isLoggedIn      | `boolean`        | `!!state.token`                      |
| selectedDevice  | `Device \| null` | Find device by `selectedDeviceId`    |

| Action             | Description                                          |
| ------------------ | ---------------------------------------------------- |
| register()         | POST `/api/auth/register`, stores token in localStorage |
| login()            | POST `/api/auth/login`, stores token in localStorage    |
| logout()           | Clears state + localStorage, navigates to `/`           |
| authFetch\<T\>()   | Wrapper for `$fetch` with `Authorization` header        |
| loadFromStorage()  | Hydrates user + token from localStorage                 |
| fetchDevices()     | GET `/api/devices`                                      |
| registerDevice()   | POST `/api/device`                                      |
| updateDevice()     | PUT `/api/device/:id`                                   |
| removeDevice()     | DELETE `/api/device/:id`                                |

**Consumed by:** All pages, all other stores

---

#### `stores/tracking.ts` — GPS Tracking Engine

**Role:** Manages browser geolocation, sends location updates to server every 15s, tracks session statistics.

| State             | Type                   | Purpose                         |
| ----------------- | ---------------------- | ------------------------------- |
| isTracking        | `boolean`              | Whether GPS watch is active     |
| location          | `LocationData \| null` | Latest GPS coordinates          |
| geoError          | `string \| null`       | Geolocation API error           |
| currentSession    | `{ id: string } \| null` | Active server session         |
| pointCount        | `number`               | Locations sent this session     |
| sessionDistance    | `number`               | Meters traveled (haversine)     |
| sessionStartTime  | `number \| null`       | Epoch ms when session started   |
| sessionElapsed    | `string`               | HH:MM:SS display string         |
| sendStatus        | `string`               | "Location sent at ..." feedback |
| selectedDeviceId  | `string`               | Device to track with            |

| Action            | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| startTracking()   | Starts geolocation watch + 15s send interval + session     |
| stopTracking()    | Stops watch, clears intervals, stops server session        |
| _sendLocation()   | POST `/api/location` + socket emit `location:update`       |
| _saveState()      | Persists tracking state to localStorage                    |
| _clearState()     | Removes tracking state from localStorage                   |

**Non-reactive internals:** `watchId`, `sendInterval`, `elapsedInterval`, `prevLat`, `prevLng` (module-level variables, not in Pinia state)

**Consumed by:** `pages/track.vue`, `plugins/tracking.client.ts`

---

#### `stores/dashboard.ts` — Live Dashboard

**Role:** Holds the latest location point for the dashboard map display.

| State            | Type                    | Purpose                      |
| ---------------- | ----------------------- | ---------------------------- |
| latestLocation   | `LocationPoint \| null` | Most recent device location  |
| filterDeviceId   | `string`                | Filter map by device         |

| Action            | Description                                      |
| ----------------- | ------------------------------------------------ |
| setFilterDeviceId | Set device filter                                |
| setLatestLocation | Update latest location (called from socket event)|
| fetchLatest()     | GET `/api/location/latest/:userId`               |

**Consumed by:** `pages/dashboard.vue`

---

#### `stores/history.ts` — Historical Data

**Role:** Manages sessions list, location history, date/device filters.

| State             | Type                | Purpose                        |
| ----------------- | ------------------- | ------------------------------ |
| sessions          | `HistorySession[]`  | Tracking sessions list         |
| locations         | `HistoryLocation[]` | Location points for map/table  |
| loading           | `boolean`           | Data loading state             |
| filterDeviceId    | `string`            | Device filter                  |
| viewMode          | `'sessions' \| 'points'` | Toggle view mode          |
| selectedSessionId | `string \| null`    | Selected session for route     |
| dateFrom / dateTo | `string`            | Date range (default: 7 days)   |

| Action            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| fetchSessions()   | GET `/api/sessions?from=&to=&deviceId=`              |
| fetchLocations()  | GET `/api/location/history/:userId?from=&to=&...`    |
| fetchData()       | Calls both fetchSessions + fetchLocations in parallel|
| selectSession()   | GET `/api/session/:id` for detailed route locations  |

**Consumed by:** `pages/history.vue`

---

#### `stores/devices-ui.ts` — Device Management Form State

**Role:** Holds UI-only state for the device management page (form inputs, edit mode, loading).

| State          | Type                    | Purpose                   |
| -------------- | ----------------------- | ------------------------- |
| newDeviceType  | `'mobile' \| 'laptop'`  | Add form device type      |
| newImei        | `string`                | Add form IMEI input       |
| newIdentifier  | `string`                | Add form identifier input |
| newName        | `string`                | Add form name input       |
| adding         | `boolean`               | Add form loading state    |
| addError       | `string`                | Add form error message    |
| devicesLoading | `boolean`               | Device list loading       |
| editingId      | `string \| null`        | Device being edited       |
| editName       | `string`                | Edit form name input      |

**Note:** This store only holds UI state. Actual device data lives in `auth.devices`. Device CRUD operations go through `auth.registerDevice()`, `auth.updateDevice()`, `auth.removeDevice()`.

**Consumed by:** `pages/devices.vue`

---

#### `stores/socket.ts` — Socket.IO Connection State

**Role:** Single boolean tracking WebSocket connection status.

| State       | Type      | Purpose                     |
| ----------- | --------- | --------------------------- |
| isConnected | `boolean` | Socket.IO connection status |

**Updated by:** `composables/useSocket.ts` (on connect/disconnect events)

**Consumed by:** `pages/dashboard.vue` (connection badge)

---

## Pages

All pages consume data exclusively from Pinia stores. No page makes direct `$fetch` or `useFetch` calls.

### Page → Store Mapping

| Page              | Stores Used                          | Middleware | Purpose                   |
| ----------------- | ------------------------------------ | ---------- | ------------------------- |
| `pages/index.vue` | `auth`                               | —          | Login / Register form     |
| `pages/dashboard.vue` | `auth`, `dashboard`, `socket`    | auth       | Live map + device list    |
| `pages/track.vue` | `auth`, `tracking`                   | auth       | GPS tracking controls     |
| `pages/devices.vue` | `auth`, `devices-ui`               | auth       | Device CRUD               |
| `pages/history.vue` | `auth`, `history`                  | auth       | Historical routes/sessions|

### Page Details

#### `pages/index.vue` — Authentication
- Tab-based login/register form
- All form state in `auth.authForm*`
- Calls `auth.login()` / `auth.register()`
- Redirects to `/dashboard` on success or if already logged in

#### `pages/dashboard.vue` — Live Dashboard
- Leaflet map with device-colored markers
- Device filter dropdown (from `auth.devices`)
- Socket.IO connection badge (from `socket.isConnected`)
- Listens to `location:update` socket event → updates `dashboard.setLatestLocation()`
- Latest location details panel
- On mount: `auth.fetchDevices()` + `dashboard.fetchLatest()`

#### `pages/track.vue` — GPS Tracking
- Device selector (active devices from `auth.devices`)
- Start/Stop buttons → `tracking.startTracking()` / `tracking.stopTracking()`
- Real-time location display (lat, lng, accuracy, speed, altitude)
- Session stats (elapsed, points, distance)
- Mini Leaflet map preview
- On mount: `auth.fetchDevices()`

#### `pages/devices.vue` — Device Management
- Registration form (UI state in `devices-ui` store)
- Device list (data from `auth.devices`)
- Edit/Enable/Disable/Delete actions → `auth.updateDevice()` / `auth.removeDevice()`
- On mount: `auth.fetchDevices()`

#### `pages/history.vue` — Location History
- Date range + device filters
- Sessions view: card list with duration/distance/point count
- Points view: table with coordinates/speed/accuracy
- Leaflet map with polyline route + start/end markers
- Session selection → `history.selectSession()`
- On mount: `auth.fetchDevices()` + `history.fetchData()`

---

## Composables

### `composables/useAuth.ts`
Convenience wrapper. Returns `{ store, authFetch }` from `useAuthStore()`.

### `composables/useSocket.ts`
Singleton Socket.IO client manager. Maintains a module-level `socket` variable that persists across page navigations.

| Method       | Description                                              |
| ------------ | -------------------------------------------------------- |
| connect()    | Creates socket with JWT auth, listens for connect/disconnect |
| disconnect() | Disconnects and nullifies socket                         |
| emit()       | Emits event if connected                                 |
| on()         | Registers socket event listener                          |
| off()        | Removes socket event listener                            |

Updates `useSocketStore().isConnected` on connect/disconnect events.

### `composables/useGeolocation.ts`
Standalone geolocation API wrapper (not currently used by stores — tracking store has its own inline implementation).

---

## Plugins & Middleware

### Plugins (client-side)

#### `plugins/00.auth.client.ts` (runs first — numbered 00)
- Loads `token` and `user` from localStorage into `auth` store
- Executes **before middleware**, so route guards can check auth

#### `plugins/tracking.client.ts`
- If user is logged in: connects Socket.IO with token via `useSocket().connect()`
- Checks localStorage for `tracking_active`
- If found: resumes tracking (starts fresh geolocation watch with saved session)
- **Note:** Socket connection was previously in a separate `01.socket.client.ts` plugin, now consolidated here

### Middleware

#### `middleware/auth.ts` (client-side route guard)
- Protects all routes except `/` and `/index`
- Redirects to `/` if `auth.isLoggedIn` is false

#### `server/middleware/auth.ts` (server-side API guard)
- Protects all `/api/*` routes except `/api/auth/*` and `/api/health`
- Validates `Authorization: Bearer <token>` header
- Verifies JWT, fetches user from database
- Attaches user to `event.context.user`
- Returns 401 if invalid

---

## Server Architecture

### Server Utilities

| File                     | Exports                           | Purpose                      |
| ------------------------ | --------------------------------- | ---------------------------- |
| `server/utils/prisma.ts` | `default` (PrismaClient)          | Singleton database client    |
| `server/utils/jwt.ts`    | `signToken()`, `verifyToken()`    | JWT sign (30d) / verify      |
| `server/utils/haversine.ts` | `haversine(lat1,lon1,lat2,lon2)` | Distance in meters          |
| `server/utils/socketServer.ts` | `initSocketServer()`, `getIO()` | Socket.IO server setup (lazy init on first HTTP request) |

### Socket.IO Server (`server/plugins/socket.ts` + `server/utils/socketServer.ts`)

- **Lazy initialization:** The Nitro plugin hooks into the first HTTP `request` event to grab the Node.js HTTP server (`req.socket.server`), then passes it to `initSocketServer()` which attaches Socket.IO once
- **Why lazy?** In Nitro 2.x, the HTTP server is not available at plugin init time (`nitroApp.h3App` does not expose it). The request hook reliably captures it on first request
- CORS: allows all origins
- Auth middleware: validates JWT before socket connection
- On connection: joins user room (`user:{userId}`)
- `location:update` event handler:
  - Saves location to database
  - Updates device `lastSeen`
  - Broadcasts to user room

### API Endpoints

#### Authentication (public)
| Method | Route                | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Create account       |
| POST   | `/api/auth/login`    | Login, returns JWT   |

#### Health (public)
| Method | Route         | Description  |
| ------ | ------------- | ------------ |
| GET    | `/api/health` | Health check |

#### Devices (authenticated)
| Method | Route               | Description     |
| ------ | ------------------- | --------------- |
| GET    | `/api/devices`      | List devices    |
| POST   | `/api/device`       | Create device   |
| PUT    | `/api/device/:id`   | Update device   |
| DELETE | `/api/device/:id`   | Delete device   |

#### Locations (authenticated)
| Method | Route                            | Description              |
| ------ | -------------------------------- | ------------------------ |
| POST   | `/api/location`                  | Save location update     |
| GET    | `/api/location/latest/:userId`   | Latest location          |
| GET    | `/api/location/history/:userId`  | Location history (query) |

#### Sessions (authenticated)
| Method | Route                      | Description             |
| ------ | -------------------------- | ----------------------- |
| POST   | `/api/session/start`       | Start tracking session  |
| POST   | `/api/session/:id/stop`    | Stop tracking session   |
| GET    | `/api/session/active`      | Get active session      |
| GET    | `/api/session/:id`         | Get session + locations  |
| GET    | `/api/sessions`            | List sessions (filtered) |

---

## Data Flow Diagrams

### 1. Authentication Flow

```
User (Browser)                    Server
     │                              │
     │  POST /api/auth/login        │
     │  { email, password }         │
     │ ─────────────────────────► │
     │                              │  bcrypt.compare()
     │                              │  signToken(userId)
     │    { token, user }           │
     │ ◄───────────────────────── │
     │                              │
     │  auth.store.token = token    │
     │  localStorage.set('token')   │
     │  router.push('/dashboard')   │
     │                              │
     │  [Plugin: 00.auth.client]    │
     │  On page refresh:            │
     │  localStorage → auth.store   │
```

### 2. Real-Time Tracking Flow

```
Track Page                    Tracking Store              Server
    │                              │                        │
    │  tracking.startTracking()    │                        │
    │ ──────────────────────────► │                        │
    │                              │  POST /api/session/start
    │                              │ ─────────────────────► │ Creates session
    │                              │  ◄───── { session }    │
    │                              │                        │
    │                              │  navigator.geolocation │
    │                              │  .watchPosition()      │
    │                              │                        │
    │                              │  [Every 15 seconds]    │
    │                              │  POST /api/location    │
    │                              │ ─────────────────────► │ Saves location
    │                              │                        │ Updates device.lastSeen
    │                              │                        │ Updates session stats
    │                              │                        │
    │                              │  socket.emit(          │
    │                              │   'location:update')   │
    │                              │ ─────────────────────► │ Broadcasts to
    │                              │                        │ user:{userId} room
    │                              │                        │
    │  ◄── location state updated  │                        │
    │  ◄── pointCount++            │                        │
    │  ◄── sessionDistance updated  │                        │
    │  ◄── sessionElapsed ticks    │                        │
```

### 3. Dashboard Real-Time Updates

```
Dashboard Page              Dashboard Store         Socket.IO
    │                            │                      │
    │  onMounted:                │                      │
    │  on('location:update')     │                      │
    │ ────────────────────────────────────────────────► │
    │                            │                      │
    │  dashboard.fetchLatest()   │                      │
    │ ──────────────────────── ► │                      │
    │                            │  authFetch(url)      │
    │                            │ ──── Server ────►    │
    │  ◄── latestLocation        │                      │
    │  updateMarker() on map     │                      │
    │                            │                      │
    │                            │   [Socket event]     │
    │  ◄────────────────────── location:update ──────── │
    │  dashboard.setLatestLocation()                    │
    │  updateMarker() on map     │                      │
```

### 4. Historical Data Flow

```
History Page                History Store              Server
    │                            │                        │
    │  history.fetchData()       │                        │
    │ ──────────────────────── ► │                        │
    │                            │  [Parallel]            │
    │                            │  GET /api/sessions     │
    │                            │ ─────────────────────► │
    │                            │  GET /api/location/    │
    │                            │      history/:userId   │
    │                            │ ─────────────────────► │
    │                            │                        │
    │  ◄── sessions[]            │                        │
    │  ◄── locations[]           │                        │
    │  drawRoute() on map        │                        │
    │                            │                        │
    │  history.selectSession()   │                        │
    │ ──────────────────────── ► │                        │
    │                            │  GET /api/session/:id  │
    │                            │ ─────────────────────► │
    │  ◄── locations[]           │                        │
    │  drawRoute() with session  │                        │
```

---

## Design System

### Color Palette (Dark Theme)

| Variable       | Value     | Usage                    |
| -------------- | --------- | ------------------------ |
| `--primary`    | `#10b981` | Buttons, links, accents  |
| `--danger`     | `#ef4444` | Delete, errors, stop     |
| `--bg`         | `#0f172a` | Page background          |
| `--bg-card`    | `#1e293b` | Card backgrounds         |
| `--bg-input`   | `#334155` | Input field backgrounds  |
| `--text`       | `#f1f5f9` | Primary text             |
| `--text-muted` | `#94a3b8` | Secondary text, labels   |
| `--border`     | `#334155` | Borders, dividers        |
| `--radius`     | `0.5rem`  | Border radius            |

### Component Classes

| Class           | Description                                |
| --------------- | ------------------------------------------ |
| `.container`    | Max 1200px, centered, 1rem padding         |
| `.btn`          | Base button (variants: primary, danger, outline) |
| `.card`         | Rounded, padded, bordered card             |
| `.input`        | Text input / select styling                |
| `.form-group`   | Label + input wrapper                      |
| `.navbar`       | Top navigation bar                         |
| `.badge`        | Status indicator (success, danger)         |
| `.map-container` | 500px height (350px on mobile)            |
| `.pulse`        | Animation for active tracking indicator    |

### Responsive Breakpoints

| Breakpoint | Target           |
| ---------- | ---------------- |
| `768px`    | Tablet and below |
| `480px`    | Mobile           |

### Map Marker Colors (Device Colors)

```
#10b981 (emerald)  — Device 1
#3b82f6 (blue)     — Device 2
#f59e0b (amber)    — Device 3
#ef4444 (red)      — Device 4
#8b5cf6 (violet)   — Device 5
#ec4899 (pink)     — Device 6
```

---

## Key Design Decisions

1. **SPA Mode (`ssr: false`)** — All rendering is client-side. The app requires browser APIs (Geolocation, localStorage, Socket.IO) that don't work in SSR.

2. **Pinia as Single Source of Truth** — Every piece of data flows through Pinia stores. Pages are pure consumers. This ensures:
   - Consistent state across page navigations
   - Easy debugging (Pinia devtools)
   - Clean separation of concerns

3. **Auth Store as Central Hub** — The auth store holds `authFetch()` which other stores use for authenticated API calls. This avoids duplicating token logic.

4. **UI State Separation** — `devices-ui` store separates form/UI state from domain data (`auth.devices`). This keeps the auth store focused on data.

5. **Socket Singleton Pattern** — The socket connection lives as a module-level variable in `useSocket()`, not in Pinia state. This prevents serialization issues and ensures a single connection.

6. **Tracking State Persistence** — Active tracking state is saved to localStorage so tracking survives page refreshes. The `tracking.client.ts` plugin restores it on load.

7. **JWT with localStorage** — Simple token persistence. The `00.auth.client.ts` plugin loads tokens before middleware runs, ensuring route guards work correctly.
