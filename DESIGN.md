# FleetBridge design spec

The binding visual spec for FleetBridge. Where this file and the frontend-design
skill disagree, this file wins, because it is tuned for this product.

## Aesthetic

A calm, dense internal data tool in the spirit of Linear, Mercury, and Resend.
Not a marketing page. No hero treatment, no gradients, no glass, no decorative
motion, no scroll triggered animation. Elegance comes from restraint, precise
spacing, and consistent type, not from effects.

## Color

Light theme only. All values are Tailwind v3 tokens so the palette stays fixed.

Surfaces and lines
- Page background: slate-50 (`#f8fafc`)
- Surface (cards, table, map frame): white (`#ffffff`)
- Border: slate-200 (`#e2e8f0`), always 1px. Separation comes from borders, never shadows.
- Row hover: slate-100 (`#f1f5f9`)

Text
- Primary: slate-900 (`#0f172a`)
- Secondary: slate-600 (`#475569`)
- Muted / labels: slate-400 (`#94a3b8`)

Accent: one indigo, used sparingly (active nav, links, focus ring, the speed line).
- indigo-600 (`#4f46e5`), hover indigo-700 (`#4338ca`), tint indigo-50 (`#eef2ff`) for the active nav pill.

Provider palette (categorical, map routes and current-position markers). Kept off
the accent indigo so the accent stays special.
- northwind: teal-600 (`#0d9488`)
- haulix: amber-600 (`#d97706`)
- tracpoint: rose-600 (`#e11d48`)
- fallback: slate-500 (`#64748b`)

Event palette (vehicle detail map markers and the event list dot).
- speeding: red-600 (`#dc2626`)
- harsh_brake: orange-600 (`#ea580c`)
- harsh_accel: amber-600 (`#d97706`)
- idling: slate-500 (`#64748b`)

## Type

- Labels and copy: system sans (Tailwind `font-sans`).
- All numbers, ids, coordinates, and timestamps: `font-mono` with `tabular-nums`.
- Weights: 400 body, 500 labels, 600 headings and metric values. Never above 700.
- Scale: text-xs (12) for labels, text-sm (14) body, metric values text-2xl (24).

## Spacing, surfaces, components

- 4px spacing base. Card padding 12 to 16px. Dense, not airy.
- Cards and frames: 1px slate-200 border, rounded-lg (8px), white, no shadow.
- Tables: uppercase text-xs muted headers with a 1px bottom border, 1px row
  dividers, slate-100 hover, numeric columns right aligned and monospace.
- Focus: 1px indigo-600 ring for keyboard users.

## Numbers

Every displayed number is rounded sensibly.
- Distance: one decimal, km.
- Speed: integer, km/h.
- Safety score: integer, 0 to 100.
- Counts: integer.
- Coordinates: 5 decimals. Timestamps: HH:MM:SS, 24 hour.

## Maps

CARTO Positron tiles. CircleMarker and Polyline only, no marker image assets.
Routes are 2px provider-colored polylines; current position is a filled
CircleMarker. The map fits its bounds to the rendered routes.

## Copy

Plain and direct. Never use em dashes or en dashes. Never use the words
seamlessly, robust, leveraging, genuinely, or honestly.
