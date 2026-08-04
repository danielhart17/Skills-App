export const COURT_ZONES = [
  {
    id: "left-corner",
    name: "Left Corner",
    color: "rgba(128, 128, 128, 0.5)",
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 0 5 L 0 40 L 10.5 35 Q 7.5 30 8 5 Z",
  },
  {
    id: "right-corner",
    name: "Right Corner",
    color: "rgba(128, 128, 128, 0.5)",
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 92 5 Q 92.5 30 89.5 35 L 100 40 L 100 5 Z",
  },
  {
    id: "left-mid",
    name: "Left Mid",
    color: "rgba(59, 130, 246, 0.5)",
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 8 5 Q 7.5 30 10.5 35 L 25 28 L 25 5 Z",
  },
  {
    id: "right-mid",
    name: "Right Mid",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 75 28 L 89.5 35 Q 92.5 30  92 5 Z",
  },
  {
    id: "left-inside",
    name: "Left Inside",
    color: "rgba(59, 130, 246, 0.5)",
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 25 5 L 40 5 Q 39 21 43 24 L 30 36 Q 25 31 25 27 L 25 5 Z",
  },
  {
    id: "inside",
    name: "Inside",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 43 24 Q 50 29.5 57 24 L 70 36 Q 67.5 39 63 41 Q 50 44.5 37 41 Q 32.5 39 30 36 L 43 24 Z",
  },
  {
    id: "right-inside",
    name: "Right Inside",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 60 5 Q 61 21 57 24 L 70 36 Q 75 31 75 27  L 75 5 Z",
  },
  {
    id: "restricted",
    name: "Restricted Area",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 40 5 L 40 17 A 3 3 0 1 0 60 17 L 60 5 Z",
  },
  {
    id: "top-key",
    name: "Top of Key",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 30 55 L 20 100 L 80 100 L 70 55 Q 50 64 30 55 Z",
  },
  {
    id: "free-throw",
    name: "Free Throw",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 37 41 L 30 55 Q 50 64 70 55 L 63 41 Q 50 45 37 41 Z",
  },
  {
    id: "left-elbow",
    name: "Left Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 25 28 Q 27 35 37 41 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-elbow",
    name: "Right Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 75 28 Q 73 35 63 41 L 70 55 Q 82 50 89.5 35 Z",
  },
  {
    id: "left-wing",
    name: "Left Wing",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 0 40 L 0 100 L 20 100 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-wing",
    name: "Right Wing",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 100 40 L 100 100 L 80 100 L 70 55 Q 82 50 89.5 35 Z",
  },
];

export const ZONE_CENTERS = {
  "left-corner": { x: 5, y: 20 },
  "right-corner": { x: 95, y: 20 },
  "left-mid": { x: 17, y: 15 },
  "right-mid": { x: 83, y: 15 },
  "left-inside": { x: 33, y: 18 },
  inside: { x: 50, y: 34 },
  "right-inside": { x: 67, y: 18 },
  restricted: { x: 50, y: 18 },
  "top-key": { x: 50, y: 75 },
  "free-throw": { x: 50, y: 50 },
  "left-elbow": { x: 25, y: 42 },
  "right-elbow": { x: 75, y: 42 },
  "left-wing": { x: 12, y: 70 },
  "right-wing": { x: 88, y: 70 },
};

export function getZoneName(zoneId) {
  return COURT_ZONES.find((zone) => zone.id === zoneId)?.name || zoneId;
}

export function mapPointToZone(courtX, courtY, fallback = "top-key") {
  if (courtX == null || courtY == null) {
    return fallback;
  }

  let bestZone = fallback;
  let bestDistance = Infinity;

  for (const [zoneId, center] of Object.entries(ZONE_CENTERS)) {
    const distance =
      (center.x - courtX) ** 2 + (center.y - courtY) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestZone = zoneId;
    }
  }

  return bestZone;
}

export function buildZoneStats(shots) {
  return shots.reduce((accumulator, shot) => {
    const zone = shot.zone;
    const current = accumulator[zone] || { made: 0, attempts: 0 };

    accumulator[zone] = {
      made: current.made + (shot.result === "make" ? 1 : 0),
      attempts: current.attempts + 1,
    };

    return accumulator;
  }, {});
}
