# WindowSeatView Project Brief

*Utility micro-site. Conductor: god (Michael). T136/T137, 2026-07-09. Owner: Will.*

## The pitch
Pick an airplane and a city. WindowSeatView tells you how far you could see from cruise altitude and which cities would be inside your view, drawn live on a map.

## Product decisions (locked by Will)
- Name: **WindowSeatView**
- Users pick an **aircraft model**; each model carries a typical cruise altitude. A manual **altitude override** slider is available.
- **Falcon 7X is the flagship/default aircraft, 41,000 ft** (it is the plane this site is being dev'd aboard; feature it with a small "our test aircraft" badge).
- Hosting: **Vercel** (static). Will deploys or hands us the repo; GitHub push info comes later.
- Monetization: Buy Me a Coffee link + Discord webhook ping on donation/feedback, SAME pattern as Will's homesparkle.pro. Use `config.js` placeholders; Will supplies real values at deploy time.

## The math (single source of truth, implement exactly)
- h = altitude in meters (ft × 0.3048)
- Geometric horizon: `d_km = 3.57 * sqrt(h_m)`
- With standard atmospheric refraction: `d_km = 3.86 * sqrt(h_m)`, label this "theoretical maximum"
- "Realistic haze" mode: cap at ~120 km typical clear-day, note it is an estimate
- Falcon 7X at 41,000 ft (12,497 m): geometric ≈ 399 km / 248 mi; refracted ≈ 432 km / 268 mi. Use as the built-in unit test.
- Show miles AND km.

## Data contracts (so build and data can proceed in parallel)
`data/aircraft.json`:
```json
[{ "id": "falcon-7x", "name": "Dassault Falcon 7X", "type": "business jet", "cruiseFt": 41000, "featured": true }]
```
`data/cities.json` (pruned GeoNames):
```json
[{ "n": "Chicago", "c": "US", "lat": 41.85, "lon": -87.65, "p": 2720546 }]
```
Keys kept short deliberately (file ships to browsers).

## Feature envelope (MVP)
1. Aircraft dropdown (grouped: business jets / airliners / regional / GA) + altitude slider override (1,000 to 51,000 ft).
2. City search box (client-side over cities.json) OR click anywhere on the map.
3. Leaflet + OpenStreetMap map: visibility circle drawn, origin pin, visible cities as dots.
4. Results panel: horizon distance (mi + km), then "Cities you could see" sorted by population, with distances.
5. Theoretical vs realistic-haze toggle.
6. Shareable URL params (?from=chicago&aircraft=falcon-7x&alt=41000).
7. Footer: BMC button (config placeholder), GeoNames + OSM attribution (required by their licenses), "How the math works" expandable note.
8. Mobile-first responsive. No build step: plain HTML/CSS/JS so Vercel deploys the folder as-is.

## Boundaries
- Free/public data ONLY (GeoNames free download, OSM tiles w/ attribution). No signups, no paid APIs, no keys.
- Real secrets never committed: `config.js` has empty placeholders + `config.example.js` documented.
- Zero em/en dashes in all copy (house rule). Warm, plain-English tone; no AI-slop phrasing.
- Aircraft cruise altitudes must be REAL and verified (typical cruise, not service ceiling); no fabricated specs.
