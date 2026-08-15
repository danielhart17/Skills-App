const METERS_PER_MILE = 1609.344;
const MAX_ACCURACY_METERS = 25;
const MAX_IMPLAUSIBLE_SPEED_MPS = 12; // ~27 mph
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

export function metersToMiles(meters) {
  return (Number(meters) || 0) / METERS_PER_MILE;
}

/** Haversine distance between two lat/lng points, in meters. */
export function haversineMeters(a, b) {
  if (!a || !b) return 0;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Returns whether a candidate GPS point should be kept.
 * - Discard accuracy > 25m
 * - Discard jumps implying speed > ~12 m/s vs previous kept point
 */
export function shouldKeepGpsPoint(point, previousKept) {
  if (!point || point.lat == null || point.lng == null) return false;
  if (point.accuracy != null && point.accuracy > MAX_ACCURACY_METERS) {
    return false;
  }
  if (!previousKept) return true;

  const meters = haversineMeters(previousKept, point);
  const dtSeconds = Math.max(0, (point.t - previousKept.t) / 1000);
  if (dtSeconds <= 0) return false;

  const speedMps = meters / dtSeconds;
  if (speedMps > MAX_IMPLAUSIBLE_SPEED_MPS) return false;

  return true;
}

/** Pace as minutes per mile from meters + moving seconds. */
export function paceMinPerMileFromMeters(distanceMeters, durationSeconds) {
  const miles = metersToMiles(distanceMeters);
  if (miles < 0.01 || !durationSeconds || durationSeconds <= 0) return null;
  return durationSeconds / 60 / miles;
}

/** Current pace from kept points within the last ~windowSeconds of movement. */
export function currentPaceFromRecentPath(path, windowSeconds = 30) {
  if (!Array.isArray(path) || path.length < 2) return null;

  const latestT = path[path.length - 1].t;
  const cutoff = latestT - windowSeconds * 1000;
  const recent = path.filter((p) => p.t >= cutoff);
  if (recent.length < 2) return null;

  let meters = 0;
  for (let i = 1; i < recent.length; i += 1) {
    meters += haversineMeters(recent[i - 1], recent[i]);
  }

  const durationSeconds = (recent[recent.length - 1].t - recent[0].t) / 1000;
  return paceMinPerMileFromMeters(meters, durationSeconds);
}

export function formatPace(minPerMile) {
  if (minPerMile == null || !Number.isFinite(minPerMile) || minPerMile <= 0) {
    return "--:--";
  }
  const totalSeconds = Math.round(minPerMile * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Elapsed moving time as mm:ss (or h:mm:ss if needed). */
export function formatDuration(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = value % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export function formatDistanceMiles(meters) {
  return metersToMiles(meters).toFixed(2);
}

export function geolocationErrorMessage(error) {
  if (!error) return "Could not get location.";
  if (typeof error === "string") return error;

  const messages = {
    1: "Location permission denied. Enable location access in your browser settings, then tap Retry.",
    2: "Location unavailable. Try moving outdoors or check device GPS, then tap Retry.",
    3: "Location request timed out. Tap Retry to try again.",
  };

  if (error.code != null && messages[error.code]) return messages[error.code];
  return error.message || "Could not get location.";
}

/**
 * One-shot permission / capability check via getCurrentPosition.
 * Resolves { ok: true, point } or { ok: false, message }.
 */
export function requestLocationPermission() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ok: false,
        message: "Geolocation is not supported in this browser.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            t: position.timestamp || Date.now(),
            accuracy: position.coords.accuracy ?? null,
          },
        });
      },
      (error) => {
        resolve({
          ok: false,
          message: geolocationErrorMessage(error),
        });
      },
      GEO_OPTIONS
    );
  });
}

/**
 * Start watching geolocation. Returns cleanup that clears the watch.
 */
export function startGeolocationWatch({ onPoint, onError }) {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolocation is not supported in this browser."));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPoint?.({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        t: position.timestamp || Date.now(),
        accuracy: position.coords.accuracy ?? null,
      });
    },
    (error) => {
      onError?.(new Error(geolocationErrorMessage(error)));
    },
    GEO_OPTIONS
  );

  return () => {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch {
      // ignore
    }
  };
}

export async function requestScreenWakeLock() {
  try {
    if (!navigator.wakeLock?.request) return null;
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(wakeLock) {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // ignore
  }
}
