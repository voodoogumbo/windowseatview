# Code Review: WindowSeatView

**Reviewer:** Irene (irene-idea-mqxdkmf0)
**Date:** 2026-07-10
**Version reviewed:** v1.3 (post T142 Grigo fixes)
**Verdict:** FIX

Two HIGH issues remain open after T142. Nothing here is a crash, but one is a direct user-facing lie (the math is now wrong in the footer) and the other is the known silent-failure pattern that has caused the map to break repeatedly.

---

## Findings by severity

### HIGH-1: Footer math explanation now contradicts the modal (user-facing)

**File:line:** `index.html:124-127`

The footer "How the Math Works" section still shows the km-based formulas:

```
d_km = 3.57 * sqrt(h_m)
d_km = 3.86 * sqrt(h_m)
```

But the "See the Math!" modal (rewritten in T142) now shows the miles-native formulas:

```
d = 1.225 * sqrt(h_ft)
d = 1.324 * sqrt(h_ft)
```

A user who reads both sections sees two different formulas for the same thing. On an educational tool built around "the math," that is a first-order problem. The footer text was not updated when the modal was converted to miles-native in T142.

**Fix:** Update `index.html:123-130` to replace the km formulas and meter variable with the feet/miles versions. The description paragraph needs updating too (currently says "converted to meters"). Simplest approach: match the modal language exactly, so both surfaces say the same thing.

---

### HIGH-2: Data load failure is completely silent

**File:line:** `js/app.js:117-119`

```js
} catch (err) {
  console.error("Error loading JSON data:", err);
}
```

If either JSON fetch fails, the app continues with empty arrays: no aircraft in the dropdown (shows "Loading aircraft..."), no cities found, no location resolved, and the map circle never draws. The user sees a blank sidebar and empty map with zero explanation.

This is the same silent-failure pattern that makes map regressions hard to diagnose in production. Developers see an empty map and have to open DevTools to find the error.

**Fix:** Add a visible error banner. One approach: add `<div id="load-error" style="display:none" ...>` to the HTML, then in the catch block: `document.getElementById("load-error").style.display = "block"`. The banner text should be plain and specific: "Could not load aircraft and city data. Check your connection and reload."

---

### MEDIUM-1: Autocomplete dropdown is not keyboard accessible

**File:line:** `js/app.js:354-368`

Autocomplete results are rendered as `<div>` elements with only a `click` handler. A keyboard user who tabs to the search box and types has no way to navigate or select from the dropdown. No `tabindex`, no `role="option"`, no `keydown` (ArrowDown/ArrowUp/Enter) handling.

**Fix:** Add `tabindex="0"` and `role="option"` to each item div, add a keydown handler for Enter and Arrow keys on the input to move focus into the list, and add `role="listbox"` to `#autocomplete-list` plus `aria-expanded` on the input.

---

### MEDIUM-2: Sequential data fetches add unnecessary startup latency

**File:line:** `js/app.js:112-116`

```js
const aircraftRes = await fetch("data/aircraft.json");
aircraftData = await aircraftRes.json();

const citiesRes = await fetch("data/cities.json");
citiesData = await citiesRes.json();
```

Aircraft and cities are independent. Fetching them in series means cities.json (12,323 records) does not start downloading until aircraft.json (25 records) has fully downloaded and parsed. On a slow connection this doubles the startup wait before the app is usable.

**Fix:** `const [aircraftRes, citiesRes] = await Promise.all([fetch("data/aircraft.json"), fetch("data/cities.json")]);` and then parse both. The catch block stays the same.

---

### MEDIUM-3: Modal has no focus trap

**File:line:** `js/app.js:309-332`

When the modal is open, pressing Tab from the close button moves focus outside the modal to the page behind it. WCAG 2.4.3 requires that modal dialogs trap keyboard focus. A keyboard user can accidentally tab through the entire underlying page while the modal is displayed.

**Fix:** Intercept `keydown` Tab inside the modal and cycle focus between focusable elements within `.modal-content`. The close button is currently the only focusable element, so trapping there is one line: in the modal's keydown handler, check `e.key === "Tab"`, then `e.preventDefault()` and `closeModalBtn.focus()`.

---

### LOW-1: Buttons have no visible keyboard focus ring

**File:line:** `css/styles.css:454`

```css
.btn {
  ...
  outline: none;
}
```

The `outline: none` rule removes the browser's default focus ring from all buttons (Share View, See the Math!, Buy Me a Coffee, the close button). Selects and text inputs have a replacement focus style (blue border, line 167-170) but buttons do not. A keyboard user cannot see which button is currently focused.

**Fix:** Replace `outline: none` with `outline: 2px solid transparent` and add a `:focus-visible` rule: `.btn:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }`. Same pattern needed for `summary` at styles.css:533.

---

### LOW-2: Altitude slider has no `aria-valuetext`

**File:line:** `index.html:50`

The slider has `min`, `max`, and `value` attributes but no `aria-valuetext`. A screen reader reads "41000" without unit context. The visible label "41,000 ft" is in a `<span>` that has no ARIA association with the slider.

**Fix:** Set `aria-valuetext` on every `input` event in the slider handler: `altitudeSlider.setAttribute("aria-valuetext", parseInt(e.target.value, 10).toLocaleString() + " feet");`.

---

### LOW-3: Autocomplete container has no ARIA role

**File:line:** `index.html:59`, `js/app.js:352-371`

`#autocomplete-list` has no `role="listbox"` and items have no `role="option"`. Screen readers see an unmarked collection of divs. Combined with LOW-1 in the keyboard a11y finding above: the autocomplete is effectively invisible to assistive technology.

**Fix:** Add `role="listbox"` to `#autocomplete-list` at render time, `role="option"` and `aria-selected="false"` to each item, and `aria-haspopup="listbox"` plus `aria-expanded` on the search input.

---

### LOW-4: Dead variable `refMiFromEngine` in modal

**File:line:** `js/app.js:433`

```js
const refMiFromEngine = kmToMi(refKm);
```

This value is computed but never used in `updateMathModalContent()`. The modal switched to the direct miles formula (`mathRefMi = 1.324 * mathSqrt`) and `refMiFromEngine` is leftover from the conversion. The numerical values agree, but the dead variable is confusing.

**Fix:** Delete line 433. If a consistency check is wanted, add an assertion in `horizon.test.mjs` instead.

---

### LOW-5: Orphaned CSS after km removal

**File:line:** `css/styles.css:428-432`

```css
.city-row-dist-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}
```

T142 removed the km sub-row from city list items, but this CSS class is still in the stylesheet. It matches nothing in the current HTML or JS. Also: haze toggle styles (`.toggle-container`, `.switch`, `.slider-round`, and related rules at lines 191-259) are dead code since the haze mode was never shipped and has no corresponding HTML or JS.

**Fix:** Delete the orphaned `.city-row-dist-sub` rule. For the haze toggle CSS: either ship the feature or delete the dead styles. The brief listed "Theoretical vs realistic-haze toggle" as an MVP feature; currently the app always uses the refracted (theoretical maximum) value. If the toggle was deliberately dropped, document that in a code comment at the top of the section and remove the CSS.

---

### LOW-6: `background-clip: text` is missing the unprefixed form

**File:line:** `css/styles.css:80`

```css
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

The non-prefixed `background-clip: text` is absent. Non-WebKit browsers (Firefox, older Edge) may not apply the gradient to the h1 text. This is unlikely to cause a visible regression since the fallback is solid white text, but it is non-standard.

**Fix:** Add `background-clip: text;` on the line after `-webkit-background-clip: text;`.

---

### LOW-7: Unclosed `<div class="form-group">` in HTML

**File:line:** `index.html:55-61`

The third `.form-group` (city search) at line 55 (8-space indent) is closed by a `</div>` at line 61 (6-space indent). The 6-space `</div>` matches the `.card` nesting level, not the `.form-group` level. The `.form-group` is implicitly closed by the browser when parsing the card's close tag. The page renders correctly because browsers recover from this, but the source structure is wrong and fragile to minification tools that assume valid nesting.

**Fix:** Add a `</div>` at 8 spaces after line 60 to explicitly close `.form-group`, then keep line 61's `</div>` to close `.card`.

---

### HYGIENE: Google Fonts external request

**File:line:** `css/styles.css:3`

`@import url('https://fonts.googleapis.com/...')` sends user IP addresses to Google on every page load. For a site with no login, no cookies, and explicit "no signups" in the brief, this is the only external data point. On corporate networks with strict egress rules, Google Fonts is sometimes blocked, causing a layout flash or fallback font.

**Note only:** The fallback stack in `--font-sans` is solid (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). If this becomes a concern, self-hosting Outfit removes the dependency entirely.

---

## Structural causes of the map regressions

The map has broken three times. All three root causes are still present.

**1. No error surface.** When tiles fail or data does not load, the result looks identical to a map that is still loading. There is no `currentMap.on("tileerror", ...)` handler, and the `loadData` catch block only logs to the console. Any production regression is invisible until a developer opens DevTools. Fix: add a `tileerror` handler that shows a text overlay on the map, and add a visible banner for data load failure (HIGH-2 above).

**2. Hardcoded CSS heights.** Both the sidebar and the map container use `height: calc(100vh - 65px - 60px)` (styles.css:104 and :319). This assumes the header is exactly 65px and the footer is exactly 60px. The button placement bug in v1.2 likely changed the sidebar height, which shifted the layout, which changed the effective map container height, which caused Leaflet to render into a wrongly-sized container. `invalidateSize()` fires after 100ms but it corrects for whatever height the container has at that moment. If the CSS calc is wrong, `invalidateSize()` locks in the wrong size. Fix: replace `height: calc(100vh - 65px - 60px)` with `flex: 1; min-height: 0` on the map container, inside a flex column parent. The map then takes whatever space is left after the header and footer render. No pixel values to go stale.

**3. No guard against double initialization.** `setupMap()` has no `if (currentMap) return;` check. If it were ever called twice (due to an init order change in a future refactor), `L.map("map", {...})` throws "Map container is already initialized." That exception propagates up, `init()` exits early without calling `setupEventListeners()` or `updateCalculations()`, and the map is blank. The fix is one line at the top of `setupMap()`: `if (currentMap) return;`.

The minimal fix that addresses all three without a rewrite: add the guard, add the two error surfaces, and replace `calc(100vh - 65px - 60px)` with `flex: 1; min-height: 0`.

---

## End-check: T142 known items

**1. Map pane renders empty after v1.2**
Status: FIXED in T142. The button was moved outside `.horizon-metrics` (HTML:77-78), which corrects the HTML structure that likely caused the layout shift. The `invalidateSize()` and ResizeObserver fallbacks are still present as a safety net.

**2. km removed sitewide (miles only)**
Status: FIXED in T142.
- `updateCalculations()` now writes only `distMiVal` (app.js:389).
- `dist-km` metric card removed from HTML.
- City row km sub-row removed (app.js:517).
- Popup now shows only mi (app.js:532).
- Math modal converted to miles-native formulas (app.js:437-438).
- One gap: the footer "How the Math Works" still shows km-based formulas (index.html:124-127). See HIGH-1 above.

**3. See the Math button placement moving below the tiles**
Status: FIXED in T142. Button is now at HTML:78, outside the `.horizon-metrics` div that closes at HTML:77.
