/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a job location is within the specified radius of the search location
 * @param jobLocation Job location string (will be geocoded)
 * @param searchCoords Search coordinates { lat, lng }
 * @param radiusKm Radius in kilometers
 * @param jobCoords Optional pre-geocoded job coordinates
 * @returns boolean indicating if job is within radius
 */
export function isWithinRadius(
  searchCoords: { lat: number; lng: number },
  jobCoords: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const distance = calculateDistance(
    searchCoords.lat,
    searchCoords.lng,
    jobCoords.lat,
    jobCoords.lng
  );
  return distance <= radiusKm;
}

// Radius options for the UI (in km)
export const RADIUS_OPTIONS = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: -1, label: "Any distance" },
] as const;

export type RadiusValue = (typeof RADIUS_OPTIONS)[number]["value"];
