# ADVERSARIAL REVIEW: WindowSeatView (Pre Deploy Gate)

**Verdict: FIX** (critical issues found with custom coordinates URL param restore and slider jank)
**Red reader: Pantheon (Claude, via Spider-ag)**
**Date: 2026-07-09**
**File: /Users/williamg/Software-Macbook/windowseatview/**

## Receipts, criterion by criterion

- **Math: PASS.** All unit tests pass. Theoretical refracted limit calculations for the Dassault Falcon 7X at 41000 ft correctly yield approximately 432 km (268 mi), and geometric horizon yields approximately 399 km (248 mi). Haze cap correctly caps at 120 km.
- **Security: PASS.** No secrets in config.js. CDN Leaflet script keeps its SRI integrity hashes. User text inputs are handled safely using textContent or value to prevent cross site scripting injections.
- **Attribution: PASS.** GeoNames credit line and OpenStreetMap contributors links are fully present in the footer.
- **House style: PASS.** 0 em dashes and 0 en dashes found in all project files.

## Findings list, ranked by severity

### 1. URL parameter restore ignores custom coordinates (High Severity)
- **File:Line:** `js/app.js:139-187` (`parseUrlParams`) and `js/app.js:441-460` (`updateUrlParams`)
- **Why it matters:** Clicking on the map updates the browser address bar to include lat and lon parameters (e.g. ?lat=45.1234&lon=-93.5678). However, when a user reloads or shares this link, parseUrlParams completely ignores these parameters. The application defaults back to Chicago, making custom coordinate sharing completely broken.
- **Suggested Fix:** Add code to parseUrlParams to check for lat and lon query parameters. If they are present, initialize customCoords with their parsed float values and center the map there.

### 2. Recalculation on every slider movement causes severe lag (Medium Severity)
- **File:Line:** `js/app.js:254-257` (`altitudeSlider.addEventListener("input")`)
- **Why it matters:** Running haversine distance calculations and DOM updates for all 12323 cities multiple times per second on every pixel of a slider drag causes severe thread blocking and browser jank.
- **Suggested Fix:** Change the input event listener to only update the visual text indicator. Trigger the expensive updateCalculations function only on the change event when the user finishes dragging.

### 3. No limit on visible cities list size locks the DOM (Medium Severity)
- **File:Line:** `js/app.js:380-438` (`updateVisibleCities`)
- **Why it matters:** In dense areas like Europe at high altitude, over 1000 cities can be in range. Generating 1000 map markers and 1000 sidebar list elements freezes the browser and creates an unscrollable sidebar list.
- **Suggested Fix:** Limit the visible cities list to the top 100 most populous cities in range, and add a note to tell the user that the list is capped.

### 4. Duplicate city names cause URL restore collision (Low Severity)
- **File:Line:** `js/app.js:170-176` (`parseUrlParams`)
- **Why it matters:** Sharing a link for London, Canada (?from=london) will resolve to London, United Kingdom upon reload because parseUrlParams simply returns the first array match.
- **Suggested Fix:** Include the country code in the URL query string (e.g. ?from=london,ca) and match against both name and country code on load.

### 5. Lack of search autocomplete debounce (Low Severity)
- **File:Line:** `js/app.js:265` and `js/app.js:279-316`
- **Why it matters:** Autocomplete filters the entire 12323 city array on every keystroke, causing typing lag on lower end mobile devices.
- **Suggested Fix:** Debounce the keyup or input handler by 150 milliseconds.

### 6. Embraer Phenom 300 typical cruise altitude is set too low (Low Severity)
- **File:Line:** `data/aircraft.json:31`
- **Why it matters:** The cruise altitude is set to 37000 ft, but this high performance business jet typically cruises between 41000 and 45000 ft. The current value undersells its typical usage.
- **Suggested Fix:** Update the cruiseFt value for phenom 300 to 41000.

### 7. Invalid CSS media query typo (Low Severity)
- **File:Line:** `css/styles.css:101`
- **Why it matters:** The media query @media (min-content-width: 768px) is invalid CSS and has no effect, remaining as dead code.
- **Suggested Fix:** Remove the invalid media query block.

## Bottom line:
FIX. The site requires essential performance optimizations and custom coordinate URL restore fixes before Vercel deploy.
