// Calculates distance between two points
export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

// Proximity threshold in pixels
export const PROXIMITY_RADIUS = 120;

export const isInProximity = (x1, y1, x2, y2) => {
  return calculateDistance(x1, y1, x2, y2) < PROXIMITY_RADIUS;
};
