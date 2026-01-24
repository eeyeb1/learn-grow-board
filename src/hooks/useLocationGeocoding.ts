import { useState, useCallback, useRef } from "react";

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName: string;
}

// In-memory cache for geocoded locations
const geocodeCache = new Map<string, GeocodedLocation | null>();

// Pre-defined coordinates for common locations to avoid API calls
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "san francisco, ca": { lat: 37.7749, lng: -122.4194 },
  "new york": { lat: 40.7128, lng: -74.006 },
  "new york, ny": { lat: 40.7128, lng: -74.006 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "austin, tx": { lat: 30.2672, lng: -97.7431 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "seattle, wa": { lat: 47.6062, lng: -122.3321 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "chicago, il": { lat: 41.8781, lng: -87.6298 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "los angeles, ca": { lat: 34.0522, lng: -118.2437 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "boston, ma": { lat: 42.3601, lng: -71.0589 },
  "denver": { lat: 39.7392, lng: -104.9903 },
  "denver, co": { lat: 39.7392, lng: -104.9903 },
  "portland": { lat: 45.5152, lng: -122.6784 },
  "portland, or": { lat: 45.5152, lng: -122.6784 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "miami, fl": { lat: 25.7617, lng: -80.1918 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "london, uk": { lat: 51.5074, lng: -0.1278 },
  "london, united kingdom": { lat: 51.5074, lng: -0.1278 },
  "mitcham": { lat: 51.4009, lng: -0.1677 },
  "mitcham, london": { lat: 51.4009, lng: -0.1677 },
  "croydon": { lat: 51.3762, lng: -0.0982 },
  "wimbledon": { lat: 51.4214, lng: -0.2064 },
  "berlin": { lat: 52.52, lng: 13.405 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
};

export const useLocationGeocoding = () => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const pendingRequests = useRef(new Map<string, Promise<GeocodedLocation | null>>());

  const geocodeLocation = useCallback(async (location: string): Promise<GeocodedLocation | null> => {
    if (!location || location.toLowerCase() === "remote") {
      return null;
    }

    const cacheKey = location.toLowerCase().trim();
    
    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey) || null;
    }

    // Check known locations
    const knownLocation = KNOWN_LOCATIONS[cacheKey];
    if (knownLocation) {
      const result: GeocodedLocation = {
        ...knownLocation,
        displayName: location,
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    // Check for partial matches in known locations
    for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
      if (cacheKey.includes(key) || key.includes(cacheKey)) {
        const result: GeocodedLocation = {
          ...coords,
          displayName: location,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }

    // Check if there's already a pending request for this location
    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey)!;
    }

    // Create the geocoding request
    const requestPromise = (async (): Promise<GeocodedLocation | null> => {
      setIsGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const result: GeocodedLocation = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              displayName: data[0].display_name,
            };
            geocodeCache.set(cacheKey, result);
            return result;
          }
        }

        geocodeCache.set(cacheKey, null);
        return null;
      } catch (error) {
        console.error("Geocoding error:", error);
        geocodeCache.set(cacheKey, null);
        return null;
      } finally {
        setIsGeocoding(false);
        pendingRequests.current.delete(cacheKey);
      }
    })();

    pendingRequests.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  const geocodeMultipleLocations = useCallback(async (
    locations: string[]
  ): Promise<Map<string, GeocodedLocation | null>> => {
    const results = new Map<string, GeocodedLocation | null>();
    
    // Filter unique locations that need geocoding
    const uniqueLocations = [...new Set(locations)];
    
    // Process in batches to avoid rate limiting (max 1 request per second for Nominatim)
    const batchSize = 5;
    for (let i = 0; i < uniqueLocations.length; i += batchSize) {
      const batch = uniqueLocations.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(loc => geocodeLocation(loc).then(result => ({ location: loc, result })))
      );
      
      batchResults.forEach(({ location, result }) => {
        results.set(location, result);
      });

      // Add a small delay between batches if more remain
      if (i + batchSize < uniqueLocations.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }, [geocodeLocation]);

  return {
    geocodeLocation,
    geocodeMultipleLocations,
    isGeocoding,
  };
};
