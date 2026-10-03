# Mable Audience Builder

Mable Audience Builder is a small two-app take-home project. The backend evaluates audience rules against synthetic, anonymous event data in SQLite. The frontend provides one operator screen for defining a rule and previewing its members.

## Prerequisites

- Node.js 22 LTS (Node 20.19+ also works with the Vite version used here)
- npm

## Install

From the repository root, install each app independently:

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

## Seed the database

The seed is deterministic and uses `2026-09-29T00:00:00.000Z` as its reference time:

```bash
cd backend
npm run seed
```

The default SQLite file is `backend/data/audience.db`. It is ignored by Git.

## Run the backend

In one terminal:

```bash
cd backend
npm run dev
```

The API runs at `http://localhost:3001`. Health check:

```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok"}`.

## Run the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173/`. The frontend uses `http://localhost:3001` by default. To change it, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.

## Test and build

Backend:

```bash
cd backend
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

## Environment variables

Backend:

- `DB_PATH`: SQLite path; defaults to `backend/data/audience.db` when run from `backend/`.
- `PORT`: HTTP port; defaults to `3001`.
- `CORS_ORIGIN`: allowed frontend origin; defaults to `http://localhost:5173`.

Frontend:

- `VITE_API_BASE_URL`: backend base URL; defaults to `http://localhost:3001`.

## Preview an audience

1. Seed the backend database.
2. Start the backend and frontend.
3. Keep the seeded `As of` value, `2026-09-29 00:00`, and the default conditions:
   - `product_view` at least `2` within `7` days
   - `purchase` exactly `0` within `7` days
4. Select **Preview audience**. The seeded data returns two members.

The same request can be sent directly to the API:

```bash
curl -X POST http://localhost:3001/v1/audiences/preview \
  -H "content-type: application/json" \
  -d '{
    "name": "Viewed but not purchased",
    "asOf": "2026-09-29T00:00:00.000Z",
    "conditions": [
      {"eventType":"product_view","operator":"at_least","count":2,"withinDays":7},
      {"eventType":"purchase","operator":"exactly","count":0,"withinDays":7}
    ]
  }'
```

All data is synthetic and anonymous. No personal data, credentials, or payment details are used.
