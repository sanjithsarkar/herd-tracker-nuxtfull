# Herd Tracker - Developer Commands

## Local Development

### Install Dependencies
```bash
npm install
```

### Run Dev Server (port 4000)
```bash
npm run dev
```
App will be available at: http://localhost:4000

---

## Prisma (Database)

### Generate Prisma Client
```bash
npx prisma generate
```

### Create Migration (after schema changes)
```bash
npx prisma migrate dev --name <migration-name>
```
Example:
```bash
npx prisma migrate dev --name add-role-and-isactive
```

### Apply Pending Migrations (production)
```bash
npx prisma migrate deploy
```

### Reset Database (WARNING: deletes all data)
```bash
npx prisma migrate reset --force
```

### Open Prisma Studio (GUI to browse database)
```bash
npx prisma studio
```

### Seed Database (creates Super Admin user)
```bash
npx prisma db seed
```
Seed uses these .env variables:
- `SUPER_ADMIN_EMAIL` (default: admin@herd.com)
- `SUPER_ADMIN_PASSWORD` (default: admin123456)
- `SUPER_ADMIN_NAME` (default: Super Admin)

### Push Schema Without Migration (quick dev sync)
```bash
npx prisma db push
```

---

## Build & Deploy

### Build for Production
```bash
npm run build
```

### Preview Production Build Locally
```bash
npm run preview
```

### Generate Static Site
```bash
npm run generate
```

---

## Deploy to Vercel

### Install Vercel CLI
```bash
npm i -g vercel
```

### Deploy (first time - will link project)
```bash
vercel
```

### Deploy to Production
```bash
vercel --prod
```

### Vercel Environment Variables (set in dashboard or CLI)
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add SUPER_ADMIN_EMAIL
vercel env add SUPER_ADMIN_PASSWORD
vercel env add SUPER_ADMIN_NAME
```

### Vercel Build Settings
- **Framework Preset**: Nuxt.js
- **Build Command**: `npm run build`
- **Output Directory**: `.output`
- **Install Command**: `npm install`

---

## Deploy to Railway / Render (Recommended for Socket.IO)

### Railway
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Init project
railway init

# Deploy
railway up
```

### Render

#### Without Database Migrate (database already migrated)
- **Build Command**: `npm install && npx prisma generate && npx prisma db seed && npm run build`
- **Start Command**: `node .output/server/index.mjs`

#### With Database Migrate (first deploy or schema changed)
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npx prisma db seed && npm run build`
- **Start Command**: `node .output/server/index.mjs`

---

## Full Setup (Fresh Clone)

### Without Database Migrate (database already exists & migrated)
```bash
# 1. Install dependencies
npm install

# 2. Setup .env file
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Generate Prisma client
npx prisma generate

# 4. Seed super admin
npx prisma db seed

# 5. Start dev server
npm run dev
```

### With Database Migrate (fresh database)
```bash
# 1. Install dependencies
npm install

# 2. Setup .env file
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Run migrations (creates tables)
npx prisma migrate dev

# 4. Seed super admin
npx prisma db seed

# 5. Start dev server
npm run dev
```

---

## Production Setup (Server)

### Without Database Migrate (database already migrated)
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Seed super admin (safe to run every time)
npx prisma db seed

# 4. Build
npm run build

# 5. Start server
node .output/server/index.mjs
```

### With Database Migrate (first deploy or schema changed)
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Apply migrations
npx prisma migrate deploy

# 4. Seed super admin (safe to run every time)
npx prisma db seed

# 5. Build
npm run build

# 6. Start server
node .output/server/index.mjs
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `SUPER_ADMIN_EMAIL` | No | Super admin email (default: admin@herd.com) |
| `SUPER_ADMIN_PASSWORD` | No | Super admin password (default: admin123456) |
| `SUPER_ADMIN_NAME` | No | Super admin name (default: Super Admin) |
