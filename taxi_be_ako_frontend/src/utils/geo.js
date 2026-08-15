export const SPIDERFY_RADIUS = 38;

export function coordKey(lat, lng, factor = 1e6) {
  return `${Math.round(lat * factor)},${Math.round(lng * factor)}`;
}

export function isValidLatLng(pos) {
  return (
    Array.isArray(pos) &&
    pos.length >= 2 &&
    typeof pos[0] === 'number' &&
    typeof pos[1] === 'number' &&
    pos[0] >= -90 &&
    pos[0] <= 90 &&
    pos[1] >= -180 &&
    pos[1] <= 180
  );
}

export function normalizeTracePoint(point) {
  if (Array.isArray(point)) {
    const lat = Number(point[0]);
    const lng = Number(point[1]);
    return isValidLatLng([lat, lng]) ? [lat, lng] : null;
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.lon ?? point.longitude);
    return isValidLatLng([lat, lng]) ? [lat, lng] : null;
  }
  return null;
}

export function distanceBetweenPositions(a, b) {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return Number.POSITIVE_INFINITY;
  const dLat = a[0] - b[0];
  const dLng = a[1] - b[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function interpolatePosition(from, to, ratio) {
  const f0 = Number(from?.[0]);
  const f1 = Number(from?.[1]);
  const t0 = Number(to?.[0]);
  const t1 = Number(to?.[1]);
  if (!isFinite(f0) || !isFinite(f1) || !isFinite(t0) || !isFinite(t1)) return from;
  return [
    f0 + (t0 - f0) * ratio,
    f1 + (t1 - f1) * ratio,
  ];
}

export function orientTraceBetweenStops(tracePositions, fromPosition, toPosition) {
  if (!tracePositions.length || !isValidLatLng(fromPosition) || !isValidLatLng(toPosition)) {
    return tracePositions;
  }

  const directScore =
    distanceBetweenPositions(fromPosition, tracePositions[0]) +
    distanceBetweenPositions(toPosition, tracePositions[tracePositions.length - 1]);
  const reverseScore =
    distanceBetweenPositions(fromPosition, tracePositions[tracePositions.length - 1]) +
    distanceBetweenPositions(toPosition, tracePositions[0]);

  return reverseScore < directScore ? tracePositions.slice().reverse() : tracePositions;
}

export function smoothTraceProgress(tracePositions, fromPosition, toPosition) {
  if (tracePositions.length < 3 || !isValidLatLng(fromPosition) || !isValidLatLng(toPosition)) {
    return tracePositions;
  }

  const totalDistance = distanceBetweenPositions(fromPosition, toPosition);
  if (!Number.isFinite(totalDistance) || totalDistance === 0) return tracePositions;

  let bestProgress = -0.05;
  return tracePositions.filter((pos) => {
    const fromDistance = distanceBetweenPositions(fromPosition, pos);
    const toDistance = distanceBetweenPositions(toPosition, pos);
    const progress = (totalDistance + fromDistance - toDistance) / (2 * totalDistance);

    if (progress + 0.12 < bestProgress) return false;
    bestProgress = Math.max(bestProgress, progress);
    return true;
  });
}

export function getPositionsKey(positions) {
  return positions.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join('|');
}

export function pathDistance(positions) {
  return positions.reduce((total, pos, index) => {
    if (index === 0) return 0;
    return total + distanceBetweenPositions(positions[index - 1], pos);
  }, 0);
}

export function isAcceptableRoutedLeg(fromPosition, toPosition, routedPositions) {
  const directDistance = distanceBetweenPositions(fromPosition, toPosition);
  const routedDistance = pathDistance(routedPositions);
  if (!Number.isFinite(directDistance) || directDistance === 0) return false;
  if (!Number.isFinite(routedDistance) || routedDistance === 0) return false;

  const extraDistance = routedDistance - directDistance;
  const ratioLimit = directDistance < 0.002 ? 8 : 4.5;
  return routedDistance <= directDistance * ratioLimit || extraDistance < 0.006;
}

export function appendPositions(target, positions) {
  positions.forEach((pos) => {
    if (!isValidLatLng(pos)) return;
    const last = target[target.length - 1];
    if (last && last[0] === pos[0] && last[1] === pos[1]) return;
    target.push(pos);
  });
}
