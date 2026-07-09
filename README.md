# WindowSeatView

WindowSeatView is a free utility website that calculates how far you can see from cruise altitude and lists which major cities would be within your view, drawn live on a map.

## Project Structure

* `index.html`: Main static site page
* `css/styles.css`: CSS styling for a clean, mobile-first design with a sky sunset theme
* `js/horizon.js`: Math module for calculating geometric and refracted horizon distances
* `js/horizon.test.mjs`: Node based unit test verifying horizon calculations for flagship aircraft
* `js/app.js`: Core controller handling Leaflet interactions and UI events
* `js/config.js`: Configuration for Buy Me a Coffee and Discord webhook endpoints (ignored by git once configured)
* `js/config.example.js`: Example configuration template
* `data/aircraft.json`: Database of verified aircraft models and cruise altitudes
* `data/cities.json`: Database of major cities and coordinates

## Math Calculations

1. Geometric Horizon:
   `d_km = 3.57 * sqrt(h_m)`

2. Theoretical Maximum (Refracted):
   `d_km = 3.86 * sqrt(h_m)`

3. Realistic Haze Mode:
   Caps visual distance at 120 km (75 miles) to simulate typical atmospheric visibility.

## Shareable Links

The site supports shareable URL parameters to save and load your current view:
* `?from=cityname,countrycode`: Centers on a specific city (e.g., `?from=london,gb` or `?from=london,ca` to avoid name collisions)
* `?lat=latitude&lon=longitude`: Centers on custom coordinates
* `?aircraft=aircraftid`: Selects an aircraft model
* `?alt=altitude`: Sets cruise altitude in feet
* `?haze=true|false`: Enables or disables realistic haze mode

## Run Locally

You can run a local server using serve or any other static web server:

```bash
npx serve .
```

Then open `http://localhost:3000` in your web browser.

## Test Math

Run the unit test suite locally using Node:

```bash
node js/horizon.test.mjs
```

## Configuration

To add Buy Me a Coffee links or Discord webhooks:
1. Copy `js/config.example.js` to `js/config.js`
2. Populate the parameters with your keys
