# FleetBridge

A telematics normalization demo. Three simulated providers send GPS pings in three incompatible raw formats. FleetBridge maps them into one canonical model and builds fleet analytics on top: trip maps, speed charts, safety events, and a per vehicle safety score.

Live: https://fleetbridge-demo.vercel.app

## Why this exists

Every telematics provider speaks its own dialect. One reports speed in mph, another in km/h, a third in meters per second. Timestamps arrive as epoch milliseconds, ISO 8601 strings, or unix seconds. One vendor puts latitude in `position.y` and longitude in `position.x`. Anyone building on fleet data has to reconcile all of it before doing anything useful, and has to keep reconciling it as providers change.

That harmonization layer is a real product category. Terminal (withterminal.com) sells it as a universal API for commercial trucking telematics, normalizing hundreds of providers into one common model. Their public docs at https://docs.withterminal.com shaped this project. FleetBridge is a small, self contained version of the same idea: enough to show the core problem, the adapter pattern that solves it, and what the unified data unlocks.

## What it does

The Fleet pages compute analytics on the canonical data: distance, average and max speed, idling, safety events, and a safety score per vehicle. The Normalization page shows each provider's raw payload beside the canonical output, with every transform documented, including the units, the timestamp formats, and the event vocabulary. The Add provider page onboards a fourth provider through configuration alone: describe where each field lives, map the event names, paste raw pings, normalize.

## The three providers

The mock providers cover the differences that make real integrations painful:

| | Northwind | Haulix | TracPoint |
|---|---|---|---|
| Speed | `spd_mph` (mph) | `speed_kmph` (km/h) | `velocity_ms` (m/s) |
| Timestamp | `ts` (epoch ms) | `recorded_at` (ISO 8601) | `time` (unix seconds) |
| Coordinates | `gps.lat` / `gps.lon` | `latitude` / `longitude` | `position.y` / `position.x` (swapped) |
| Events | `harshBraking`, `overspeed`, ... | `HARD_BRAKE`, `SPEEDING`, ... | numeric codes 1 to 4 |

TracPoint's coordinate swap is deliberate. Real devices ship with exactly this kind of trap, and an adapter that is not tested against it will happily plot a fleet in the ocean.

## The common model

All adapters emit the same canonical shapes, defined in `src/core`. A location is a `vehicleId`, an ISO timestamp, `lat`, `lng`, `speedKmh`, and `headingDeg`. An event is a typed safety event (`harsh_brake`, `harsh_accel`, `speeding`, `idling`) with a position and time. Everything downstream, the maps, the charts, the scores, the fleet table, consumes only the canonical model and never knows which provider the data came from. That separation is the entire point.

## Adding a provider is configuration

The config adapter behind the Add provider page treats a new integration as data, not code: JSON paths for each field, a unit for speed, a format for time, and a mapping table for event names. Input is validated before normalization, so non finite numerics, empty paths, and malformed timestamps are rejected with specific errors. The three built in providers use hand written adapters; Fleetwave, the example that loads with the page, is normalized entirely through configuration.

## Analytics and the safety score

Per vehicle stats are computed from the canonical pings. The safety score rates each vehicle by safety events per hour of driving time, weighted by severity, mapped to a 0 to 100 scale where higher is safer. Exposure is hours rather than distance on purpose: a per 100 km score punishes short local trips, where a handful of events against a tiny denominator produces a terrible number, while a long haul with identical behaviour looks clean. Per hour keeps trips of different lengths comparable. Vehicles with no driving time are excluded from the fleet average. The exact weights live beside the score implementation and its tests.

## The data

All trips are synthetic. A generator (`scripts/generate.ts`) lays trips along five real GTA corridors (the 401, the 400, the QEW, the DVP, and the Gardiner) using densified waypoints so interpolated pings follow the actual highway alignment, then emits each trip in every needed provider dialect. No map matching library is used, so traces sit on or beside the road rather than snapping to lanes. Several vehicles run the same physical route through different providers, which makes it easy to verify that the same trip produces the same canonical output no matter which dialect it arrived in. Timestamps, speeds, event placement, and idle gaps are generated to be plausible rather than recorded.

## Stack

Vite, React 19, TypeScript strict, Tailwind, react-leaflet, Recharts, Vitest. Deployed on Vercel as a static single page app. There is no backend and no database: raw payloads are committed fixtures and everything runs in the browser.

## Run it

```
npm install
npm run dev
npm run test
```

## What's next

In rough order: a small read only API exposing the canonical model (vehicles, locations, events) as serverless endpoints with cursor pagination, and an Issues view surfacing the data quality problems adapters can detect, like swapped axes, unit mismatches, and gaps in a vehicle's breadcrumb trail.
