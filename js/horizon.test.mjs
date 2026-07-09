import { ftToM, kmToMi, calculateHorizonGeometric, calculateHorizonRefracted } from "./horizon.js";

const altFt = 41000;
const altM = ftToM(altFt);
const geoKm = calculateHorizonGeometric(altM);
const geoMi = kmToMi(geoKm);
const refKm = calculateHorizonRefracted(altM);
const refMi = kmToMi(refKm);

console.log("Falcon 7X unit test results:");
console.log(`Altitude: ${altFt} ft (${altM.toFixed(1)} m)`);
console.log(`Geometric: ${geoKm.toFixed(2)} km (${geoMi.toFixed(2)} mi)`);
console.log(`Refracted: ${refKm.toFixed(2)} km (${refMi.toFixed(2)} mi)`);

// Assert close approximations matching brief (399 km / 248 mi, 432 km / 268 mi)
const geoKmOk = Math.abs(geoKm - 399) < 1.0;
const geoMiOk = Math.abs(geoMi - 248) < 1.0;
const refKmOk = Math.abs(refKm - 432) < 1.0;
const refMiOk = Math.abs(refMi - 268) < 1.0;

if (geoKmOk && geoMiOk && refKmOk && refMiOk) {
  console.log("All assertions passed successfully");
  process.exit(0);
} else {
  console.error("Test assertion failed");
  process.exit(1);
}
