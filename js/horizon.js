// Horizon math module for WindowSeatView
//
// Math specifications from project brief:
// h = altitude in meters (ft * 0.3048)
// Geometric horizon: d_km = 3.57 * sqrt(h_m)
// Refracted horizon: d_km = 3.86 * sqrt(h_m) (theoretical maximum)
//
// Falcon 7X unit test values:
// Altitude: 41000 ft (12496.8 m)
// Geometric: 399.09 km (248.00 mi)
// Refracted: 431.51 km (268.12 mi)

export function ftToM(feet) {
  return feet * 0.3048;
}

export function mToFt(meters) {
  return meters / 0.3048;
}

export function kmToMi(km) {
  return km * 0.621371;
}

export function calculateHorizonGeometric(altitudeMeters) {
  if (altitudeMeters < 0) return 0;
  return 3.57 * Math.sqrt(altitudeMeters);
}

export function calculateHorizonRefracted(altitudeMeters) {
  if (altitudeMeters < 0) return 0;
  return 3.86 * Math.sqrt(altitudeMeters);
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

