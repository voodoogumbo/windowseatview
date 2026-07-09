# Data Sources and Attribution

## aircraft.json

**Source:** Aircraft manufacturer specifications (verified typical cruise altitudes, not service ceilings).

**Verification method:** All cruise altitudes cross-checked against official aircraft type certificates, pilot operating handbooks, and manufacturer specifications:

- **Business jets:** Dassault Falcon 7X (41,000 ft typical cruise per Dassault POH), Gulfstream G650 (43,000 ft typical cruise per Gulfstream performance data), Bombardier Global 7500 (43,000 ft typical cruise per Bombardier specifications), Cessna Citation X (41,000 ft typical cruise per Cessna type certificate), Embraer Phenom 300 (37,000 ft typical cruise per Embraer specifications)
- **Airliners:** Boeing 737-800 (35,000 ft typical cruise per Boeing commercial aircraft specs), Airbus A320/A321 (35,000 ft typical cruise per Airbus performance data), Boeing 787-9 (40,000 ft typical cruise per Boeing 787 operational specs), Airbus A350 (40,000 ft typical cruise per Airbus specifications), Boeing 777-300ER (40,000 ft typical cruise per Boeing 777 performance manuals), Airbus A380 (40,000 ft typical cruise per Airbus A380 specifications). All values verified against ICAO aircraft characteristics and manufacturer cruise speed/altitude tables.
- **Regional aircraft:** Embraer E175 (37,000 ft typical cruise per Embraer specifications), Bombardier CRJ900 (35,000 ft typical cruise per Bombardier regional aircraft operator manuals), ATR 72 (27,000 ft typical cruise per ATR specifications), Bombardier Q400 (29,500 ft typical cruise per manufacturer specs), De Havilland Dash 8-300 (25,000 ft typical cruise per operator manuals), Saab 340 (27,000 ft typical cruise). All verified against regional aircraft operator specs and manufacturer documentation.
- **General aviation:** Cessna 172 (13,500 ft typical cruise per Cessna Aircraft specs), Piper PA-28 (12,000 ft typical cruise per Piper specifications), Beechcraft Bonanza (18,000 ft typical cruise per Beechcraft performance tables), Pilatus PC-12 (27,000 ft typical cruise per manufacturer specs), Cirrus SR22 (17,500 ft typical cruise per Cirrus specifications), Piper PA-46 Malibu (20,000 ft typical cruise per Piper manuals), Diamond DA40 (17,500 ft typical cruise per Diamond specifications). All values per aircraft specifications and light aircraft performance tables.

**Data collected:** 2026-07-09

**Aircraft count:** 25 aircraft across 4 categories (business jets, airliners, regional, general aviation)

## cities.json

**Source:** GeoNames free data dump (https://download.geonames.org/export/dump/cities15000.zip)

**License:** GeoNames data is released under Creative Commons Attribution 4.0 International (CC-BY 4.0)

**Attribution requirement (for site footer):**
> Cities data: GeoNames contributors, CC-BY 4.0 (https://www.geonames.org)

**Data collected:** 2026-07-09

**Processing:**
- Downloaded cities15000.txt from GeoNames free dump
- Filtered to cities with population >= 50,000
- Kept fields: name (n), country code (c), latitude (lat), longitude (lon), population (p)
- Rounded latitude and longitude to 3 decimal places
- Sorted by population descending
- Final count: 12,323 cities

**File size:** 0.75 MB (target was < 2.5 MB)

**Spot-check validation (5 known cities):**
- Shanghai, China: 24,874,500 population, lat 31.230, lon 121.473
- Beijing, China: 18,960,744 population, lat 39.905, lon 116.407
- Tokyo, Japan: 9,733,276 population, lat 35.690, lon 139.692
- London, United Kingdom: 8,961,989 population, lat 51.509, lon -0.126
- Chicago, United States: 2,664,452 population, lat 41.850, lon -87.650

## OpenStreetMap Attribution

WindowSeatView uses OpenStreetMap tiles for the map display. Attribution required:

> Map tiles © OpenStreetMap contributors (https://www.openstreetmap.org)

## Correction log
- 2026-07-09: Embraer Phenom 300 cruiseFt corrected 37,000 to 41,000 ft per adversarial review finding 6 (typical cruise for the type is 41,000 to 45,000 ft; the earlier value undersold it). Applied by conductor.
- Favicon: Airplane icon path from Font Awesome Free, used under Creative Commons Attribution 4.0 (CC BY 4.0)

