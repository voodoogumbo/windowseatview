// WindowSeatView main application script
import { config } from "./config.js?v=1.4";
import { 
  ftToM, 
  kmToMi, 
  calculateHorizonGeometric, 
  calculateHorizonRefracted, 
  haversineDistanceKm 
} from "./horizon.js?v=1.4";

// State variables
let aircraftData = [];
let citiesData = [];
let selectedCity = null;
let customCoords = null;
let currentMap = null;
let horizonCircle = null;
let originMarker = null;
let cityMarkersGroup = null;

// DOM Elements
const aircraftSelect = document.getElementById("aircraft-select");
const altitudeSlider = document.getElementById("altitude-slider");
const altitudeVal = document.getElementById("altitude-val");
const citySearchInput = document.getElementById("city-search");
const autocompleteList = document.getElementById("autocomplete-list");
const selectedLocationName = document.getElementById("selected-location-name");
const distMiVal = document.getElementById("dist-mi");
const visibleCitiesList = document.getElementById("visible-cities-list");
const shareBtn = document.getElementById("share-btn");
const flagshipBadge = document.getElementById("flagship-badge");

// Helper function for debouncing expensive operations
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize application
async function init() {
  setupBuyMeACoffee();
  setupMap();
  await loadData();
  populateAircraftDropdown();
  parseUrlParams();
  setupEventListeners();
  updateCalculations();
}

// Render BMC button if configured
function setupBuyMeACoffee() {
  const container = document.getElementById("bmc-container");
  if (config && config.bmcUrl) {
    container.innerHTML = `
      <a href="${config.bmcUrl}" target="_blank" rel="noopener" class="btn btn-bmc">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
          <line x1="6" y1="1" x2="6" y2="4"></line>
          <line x1="10" y1="1" x2="10" y2="4"></line>
          <line x1="14" y1="1" x2="14" y2="4"></line>
        </svg>
        Buy me a coffee
      </a>
    `;
  }
}

// Setup Leaflet map
function setupMap() {
  // Prevent double initialization
  if (currentMap) return;

  currentMap = L.map("map", {
    center: [39.8283, -98.5795],
    zoom: 4,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
  }).addTo(currentMap);

  cityMarkersGroup = L.layerGroup().addTo(currentMap);

  currentMap.on("click", (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    setCustomLocation(lat, lon);
  });

  // Handle tile load errors
  currentMap.on("tileerror", () => {
    const mapOverlay = document.getElementById("map-error-overlay");
    if (mapOverlay) {
      mapOverlay.style.display = "flex";
    }
  });

  // Fix Leaflet collapsed container and partial tile load bugs
  window.addEventListener("load", () => {
    setTimeout(() => {
      currentMap.invalidateSize();
    }, 100);
  });

  const mapContainer = document.querySelector(".map-container");
  if (mapContainer) {
    const resizeObserver = new ResizeObserver(debounce(() => {
      currentMap.invalidateSize();
    }, 100));
    resizeObserver.observe(mapContainer);
  }
}

// Fetch cities and aircraft data in parallel
async function loadData() {
  try {
    const [aircraftRes, citiesRes] = await Promise.all([
      fetch("data/aircraft.json"),
      fetch("data/cities.json")
    ]);
    aircraftData = await aircraftRes.json();
    citiesData = await citiesRes.json();
  } catch (err) {
    console.error("Error loading JSON data:", err);
    const errorBanner = document.getElementById("load-error");
    if (errorBanner) {
      errorBanner.style.display = "block";
    }
  }
}

// Populate aircraft dropdown with optgroups
function populateAircraftDropdown() {
  if (!aircraftData.length) return;

  const groups = {};
  aircraftData.forEach(ac => {
    if (!groups[ac.type]) {
      groups[ac.type] = [];
    }
    groups[ac.type].push(ac);
  });

  aircraftSelect.innerHTML = "";
  
  for (const [type, list] of Object.entries(groups)) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = type.charAt(0).toUpperCase() + type.slice(1);
    
    list.forEach(ac => {
      const option = document.createElement("option");
      option.value = ac.id;
      option.textContent = ac.name;
      if (ac.featured) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    });
    
    aircraftSelect.appendChild(optgroup);
  }
}

// Parse URL query parameters
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("from");
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const aircraftParam = params.get("aircraft");
  const altParam = params.get("alt");

  // Set aircraft if specified
  if (aircraftParam && aircraftData.some(ac => ac.id === aircraftParam)) {
    aircraftSelect.value = aircraftParam;
    toggleFlagshipBadge(aircraftParam === "falcon-7x");
  }

  // Set altitude if specified
  if (altParam) {
    const alt = parseInt(altParam, 10);
    if (!isNaN(alt) && alt >= 1000 && alt <= 51000) {
      altitudeSlider.value = alt;
      altitudeVal.textContent = alt.toLocaleString() + " ft";
      altitudeSlider.setAttribute("aria-valuetext", alt.toLocaleString() + " feet");
    }
  } else {
    updateAltitudeFromSelect();
  }

  // Resolve starting location
  if (latParam && lonParam) {
    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    if (!isNaN(lat) && !isNaN(lon)) {
      customCoords = { lat, lon };
      selectedCity = null;
    }
  } else if (fromParam) {
    const parts = fromParam.split(",");
    const name = parts[0].trim().toLowerCase();
    const country = parts[1] ? parts[1].trim().toLowerCase() : null;
    
    const match = citiesData.find(c => {
      if (country) {
        return c.n.toLowerCase() === name && c.c.toLowerCase() === country;
      }
      return c.n.toLowerCase() === name;
    });
    
    if (match) {
      selectedCity = match;
      customCoords = null;
    }
  }
  
  // Default to Chicago if no starting location was parsed
  if (!selectedCity && !customCoords && citiesData.length) {
    selectedCity = citiesData.find(c => c.n === "Chicago") || citiesData[0];
  }

  if (selectedCity) {
    updateCityUI(selectedCity.n, selectedCity.c);
    currentMap.setView([selectedCity.lat, selectedCity.lon], 6);
  } else if (customCoords) {
    selectedLocationName.textContent = resolveLocationName(customCoords.lat, customCoords.lon);
    citySearchInput.value = "";
    currentMap.setView([customCoords.lat, customCoords.lon], 6);
  }
}

// Set flagship badge visibility
function toggleFlagshipBadge(show) {
  if (show) {
    flagshipBadge.style.display = "inline-block";
  } else {
    flagshipBadge.style.display = "none";
  }
}

// Update altitude slider to match selected aircraft cruise altitude
function updateAltitudeFromSelect() {
  const acId = aircraftSelect.value;
  const ac = aircraftData.find(a => a.id === acId);
  if (ac) {
    altitudeSlider.value = ac.cruiseFt;
    altitudeVal.textContent = ac.cruiseFt.toLocaleString() + " ft";
    altitudeSlider.setAttribute("aria-valuetext", ac.cruiseFt.toLocaleString() + " feet");
    toggleFlagshipBadge(acId === "falcon-7x");
  }
}

// Find closest city within 50 km for friendly label
function resolveLocationName(lat, lon) {
  let closestCity = null;
  let minDist = Infinity;
  
  citiesData.forEach(c => {
    const dist = haversineDistanceKm(lat, lon, c.lat, c.lon);
    if (dist < minDist) {
      minDist = dist;
      closestCity = c;
    }
  });

  if (closestCity && minDist < 50) {
    return `Near ${closestCity.n}, ${closestCity.c} (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  } else {
    return `Custom Position (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  }
}

// Set coordinate point from custom map click
function setCustomLocation(lat, lon) {
  selectedCity = null;
  customCoords = { lat, lon };
  selectedLocationName.textContent = resolveLocationName(lat, lon);
  citySearchInput.value = "";
  updateCalculations();
}

// Update UI with selected city
function updateCityUI(name, countryCode) {
  selectedLocationName.textContent = `${name}, ${countryCode}`;
  citySearchInput.value = name;
}

function setupEventListeners() {
  aircraftSelect.addEventListener("change", () => {
    updateAltitudeFromSelect();
    updateCalculations();
  });

  // Optimize performance by updating visual readout text only during drag
  altitudeSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    altitudeVal.textContent = val.toLocaleString() + " ft";
    altitudeSlider.setAttribute("aria-valuetext", val.toLocaleString() + " feet");
  });

  // Expensive recalculation runs only when user finishes dragging slider
  altitudeSlider.addEventListener("change", () => {
    updateCalculations();
  });

  // Autocomplete search input handler with a 150ms debounce
  const debouncedSearch = debounce(handleSearchInput, 150);
  citySearchInput.addEventListener("input", debouncedSearch);
  
  document.addEventListener("click", (e) => {
    if (e.target !== citySearchInput) {
      autocompleteList.style.display = "none";
      citySearchInput.setAttribute("aria-expanded", "false");
    }
  });

  // Search input keyboard trigger to focus Suggestions list
  citySearchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      const firstItem = autocompleteList.querySelector(".autocomplete-item");
      if (firstItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
  });

  shareBtn.addEventListener("click", copyShareUrl);

  // Math Modal controls
  const mathModal = document.getElementById("math-modal");
  const openMathBtn = document.getElementById("open-math-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");

  openMathBtn.addEventListener("click", () => {
    updateMathModalContent();
    mathModal.style.display = "flex";
    closeModalBtn.focus();
  });

  const closeModal = () => {
    mathModal.style.display = "none";
    openMathBtn.focus();
  };

  closeModalBtn.addEventListener("click", closeModal);

  mathModal.addEventListener("click", (e) => {
    if (e.target === mathModal) {
      closeModal();
    }
  });

  // Modal keyboard listener with focus trap
  document.addEventListener("keydown", (e) => {
    if (mathModal.style.display === "flex") {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Tab") {
        e.preventDefault();
        closeModalBtn.focus();
      }
    }
  });
}

// Autocomplete search handler
function handleSearchInput() {
  const query = citySearchInput.value.trim().toLowerCase();
  if (!query) {
    autocompleteList.style.display = "none";
    citySearchInput.setAttribute("aria-expanded", "false");
    return;
  }

  const matches = citiesData
    .filter(c => c.n.toLowerCase().includes(query))
    .slice(0, 5);

  if (!matches.length) {
    autocompleteList.style.display = "none";
    citySearchInput.setAttribute("aria-expanded", "false");
    return;
  }

  autocompleteList.innerHTML = "";
  citySearchInput.setAttribute("aria-expanded", "true");

  matches.forEach((c, idx) => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.setAttribute("role", "option");
    div.setAttribute("tabindex", "0");
    div.setAttribute("aria-selected", "false");
    div.id = `city-suggest-opt-${idx}`;
    div.innerHTML = `
      <span>${c.n}</span>
      <span class="autocomplete-country">${c.c}</span>
    `;

    const selectThisCity = () => {
      selectedCity = c;
      customCoords = null;
      updateCityUI(c.n, c.c);
      currentMap.setView([c.lat, c.lon], 6);
      autocompleteList.style.display = "none";
      citySearchInput.setAttribute("aria-expanded", "false");
      updateCalculations();
    };

    div.addEventListener("click", selectThisCity);

    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        selectThisCity();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = div.nextSibling;
        if (next) {
          next.focus();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = div.previousSibling;
        if (prev) {
          prev.focus();
        } else {
          citySearchInput.focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        autocompleteList.style.display = "none";
        citySearchInput.setAttribute("aria-expanded", "false");
        citySearchInput.focus();
      }
    });

    // Update suggestions aria-selected on focus
    div.addEventListener("focus", () => {
      const items = autocompleteList.querySelectorAll(".autocomplete-item");
      items.forEach(el => el.setAttribute("aria-selected", "false"));
      div.setAttribute("aria-selected", "true");
    });

    autocompleteList.appendChild(div);
  });

  autocompleteList.style.display = "block";
}

// Core calculation and map update
function updateCalculations() {
  const lat = selectedCity ? selectedCity.lat : (customCoords ? customCoords.lat : null);
  const lon = selectedCity ? selectedCity.lon : (customCoords ? customCoords.lon : null);

  if (lat === null || lon === null) return;

  const altFtVal = parseInt(altitudeSlider.value, 10);
  const altMVal = ftToM(altFtVal);

  // Always use refracted theoretical horizon distance
  const refKm = calculateHorizonRefracted(altMVal);
  const refMi = kmToMi(refKm);

  // Update UI values (miles only)
  distMiVal.textContent = Math.round(refMi) + " mi";

  if (originMarker) {
    currentMap.removeLayer(originMarker);
  }
  
  const customIcon = L.divIcon({
    className: "custom-origin-icon",
    html: "<div style=\"background-color:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.5);\"></div>",
    iconSize: [12, 12]
  });
  
  originMarker = L.marker([lat, lon], { icon: customIcon }).addTo(currentMap);

  if (horizonCircle) {
    currentMap.removeLayer(horizonCircle);
  }

  const color = "#f59e0b";
  horizonCircle = L.circle([lat, lon], {
    radius: refKm * 1000,
    color: color,
    fillColor: color,
    fillOpacity: 0.1,
    weight: 2,
    dashArray: null
  }).addTo(currentMap);

  updateVisibleCities(lat, lon, refKm);
  updateUrlParams(lat, lon, altFtVal);

  // Update math modal content if it is open
  const mathModal = document.getElementById("math-modal");
  if (mathModal && mathModal.style.display === "flex") {
    updateMathModalContent();
  }
}

// Populate Math Modal content with live figures (miles native math lessons)
function updateMathModalContent() {
  const altFt = parseInt(altitudeSlider.value, 10);
  
  // Miles native calculations
  const mathSqrt = Math.sqrt(altFt);
  const mathGeoMi = 1.225 * mathSqrt;
  const mathRefMi = 1.324 * mathSqrt;
  
  const modalBody = document.getElementById("modal-math-details");
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="math-step">
      <div class="math-step-title">1. Cruise Altitude</div>
      <div class="math-formula">Altitude: ${altFt.toLocaleString()} ft</div>
      <div class="math-desc">Your flight level or current altitude measured in feet.</div>
    </div>
    
    <div class="math-step">
      <div class="math-step-title">2. Geometric Horizon</div>
      <div class="math-formula">d = 1.225 &times; &radic;h</div>
      <div class="math-sub">d = 1.225 &times; &radic;${altFt.toLocaleString()} = ${Math.round(mathGeoMi).toLocaleString()} mi</div>
      <div class="math-desc">What your eye could reach on a perfectly round, airless Earth.</div>
    </div>
    
    <div class="math-step">
      <div class="math-step-title">3. Refraction Bonus</div>
      <div class="math-formula">d = 1.324 &times; &radic;h</div>
      <div class="math-sub">d = 1.324 &times; &radic;${altFt.toLocaleString()} = ${Math.round(mathRefMi).toLocaleString()} mi</div>
      <div class="math-desc">Earth's atmosphere bends light downward around the curve, stretching your view by about 8 percent. This is the distance used by the map.</div>
    </div>
    
    <div class="math-desc" style="text-align: center; margin-top: 0.5rem;">
      The mathematical constants in these formulas fold in Earth's radius, unit conversions, and atmospheric refraction.
    </div>

    <div class="math-kid-friendly">
      From your seat, you can see across a horizon that is ${Math.round(mathRefMi).toLocaleString()} mi wide!
    </div>
  `;
}

// Compute visible cities and render list
function updateVisibleCities(centerLat, centerLon, horizonLimitKm) {
  cityMarkersGroup.clearLayers();
  
  const visible = [];
  citiesData.forEach(c => {
    if (selectedCity && c.n === selectedCity.n && c.c === selectedCity.c) return;
    
    const distKm = haversineDistanceKm(centerLat, centerLon, c.lat, c.lon);
    if (distKm <= horizonLimitKm) {
      visible.push({ ...c, distKm, distMi: kmToMi(distKm) });
    }
  });

  visible.sort((a, b) => b.p - a.p);

  const totalCount = visible.length;
  const displayLimit = 100;
  const rendered = visible.slice(0, displayLimit);

  visibleCitiesList.innerHTML = "";
  if (!totalCount) {
    visibleCitiesList.innerHTML = "<div class=\"no-cities-msg\">No visible cities in range.</div>";
    return;
  }

  // Prepend note if list is capped
  if (totalCount > displayLimit) {
    const note = document.createElement("div");
    note.style.cssText = "padding: 0.5rem 0.75rem; text-align: center; font-size: 0.75rem; color: var(--accent-gold); background-color: rgba(245, 158, 11, 0.08); border-bottom: 1px solid var(--border-color); font-weight: 500;";
    note.textContent = `Showing the ${displayLimit} largest of ${totalCount} cities in range`;
    visibleCitiesList.appendChild(note);
  }

  rendered.forEach(c => {
    const row = document.createElement("div");
    row.className = "city-row";
    row.innerHTML = `
      <div>
        <div class="city-row-name">${c.n}</div>
        <div class="city-row-pop">Pop: ${c.p.toLocaleString()}</div>
      </div>
      <div class="city-row-dist">
        <div>${Math.round(c.distMi)} mi</div>
      </div>
    `;
    visibleCitiesList.appendChild(row);

    const marker = L.circleMarker([c.lat, c.lon], {
      radius: 4,
      fillColor: "#cbd5e1",
      color: "#1e293b",
      weight: 1,
      fillOpacity: 0.8
    });
    
    marker.bindPopup(`
      <strong>${c.n}, ${c.c}</strong><br>
      Distance: ${Math.round(c.distMi)} mi<br>
      Population: ${c.p.toLocaleString()}
    `);
    
    cityMarkersGroup.addLayer(marker);
  });
}

// Update URL parameters
function updateUrlParams(lat, lon, altFt) {
  const params = new URLSearchParams(window.location.search);
  
  if (selectedCity) {
    params.set("from", `${selectedCity.n.toLowerCase()},${selectedCity.c.toLowerCase()}`);
    params.delete("lat");
    params.delete("lon");
  } else if (customCoords) {
    params.delete("from");
    params.set("lat", lat.toFixed(4));
    params.set("lon", lon.toFixed(4));
  }
  
  params.set("aircraft", aircraftSelect.value);
  params.set("alt", altFt);
  
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

// Copy sharing link to clipboard
function copyShareUrl() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const originalText = shareBtn.innerHTML;
    shareBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      shareBtn.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Could not copy share URL:", err);
  });
}

// Start application immediately on load
init();
