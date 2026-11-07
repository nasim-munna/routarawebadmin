# Routara admin panel

Web panel for managers and admins: overview, live map, attendance, people and sales setup (territories, distributors, outlets, products, beat plans, itinerary and targets).
It runs on Next.js and talks to the Django API in `../peopletracker`.

## Try it with made-up data

No database needed. Run these in two terminals:

    npm install
    npm run demo-api
    npm run dev

Open http://localhost:3000 and sign in with `admin@routara.demo` or
`manager@routara.demo`, password `Demo@1234`. The demo API runs on port 8000,
so stop it before starting Django there.

## Run against the real API

Create `.env.local`:

    API_ORIGIN=http://localhost:8000
    NEXT_PUBLIC_WS_ORIGIN=ws://localhost:8000
    NEXT_PUBLIC_TIME_ZONE=Asia/Dhaka

`API_ORIGIN` is read at build time for the `/backend` rewrite, so set it before
`npm run build`. In production `NEXT_PUBLIC_WS_ORIGIN` must be a `wss://` address.

## How sign-in works

The access token is kept in memory only. The long-lived refresh token is held
in an httpOnly cookie by `src/app/api/session/*`, so page scripts can't read it.
Employees are refused here and use the mobile app.

## Maps

Street tiles come from OpenFreeMap and satellite imagery from Esri, neither
needing a key. Check their usage terms before relying on them at scale.
