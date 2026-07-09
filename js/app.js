// WindowSeatView main application script
import { config } from "./config.js";
import { 
  ftToM, 
  kmToMi, 
  calculateHorizonGeometric, 
  calculateHorizonRefracted, 
  haversineDistanceKm 
} from "./horizon.js";

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
const distKmVal = document.getElementById("dist-km");
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

// Fetch cities and aircraft data
async function loadData() {
  try {
    const aircraftRes = await fetch("data/aircraft.json");
    aircraftData = await aircraftRes.json();

    const citiesRes = await fetch("data/cities.json");
    citiesData = await citiesRes.json();
  } catch (err) {
    console.error("Error loading JSON data:", err);
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

// Set up UI listeners
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function setupEventListeners() {
  aircraftSelect.addEventListener("change", () => {
    updateAltitudeFromSelect();
    updateCalculations();
  });

  // Optimize performance by updating visual readout text only during drag
  altitudeSlider.addEventListener("input", (e) => {
    altitudeVal.textContent = parseInt(e.target.value, 10).toLocaleString() + " ft";
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
    }
  });

  shareBtn.addEventListener("click", copyShareUrl);
}

// Autocomplete search handler
function handleSearchInput() {
  const query = citySearchInput.value.trim().toLowerCase();
  if (!query) {
    autocompleteList.style.display = "none";
    return;
  }

  const matches = citiesData
    .filter(c => c.n.toLowerCase().includes(query))
    .slice(0, 5);

  if (!matches.length) {
    autocompleteList.style.display = "none";
    return;
  }

  autocompleteList.innerHTML = "";
  matches.forEach(c => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.innerHTML = `
      <span>${c.n}</span>
      <span class="autocomplete-country">${c.c}</span>
    `;
    div.addEventListener("click", () => {
      selectedCity = c;
      customCoords = null;
      updateCityUI(c.n, c.c);
      currentMap.setView([c.lat, c.lon], 6);
      autocompleteList.style.display = "none";
      updateCalculations();
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

  // Update UI values
  distKmVal.textContent = Math.round(refKm) + " km";
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
        <div class="city-row-dist-sub">${Math.round(c.distKm)} km</div>
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
      Distance: ${Math.round(c.distMi)} mi (${Math.round(c.distKm)} km)<br>
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

// Start application
window.addEventListener("DOMContentLoaded", init);
