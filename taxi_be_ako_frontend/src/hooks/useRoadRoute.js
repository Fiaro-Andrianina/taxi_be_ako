import { useMemo, useEffect, useState } from 'react';
import { getPositionsKey } from '../utils/geo';
import { fetchRoadRoutePositions } from '../utils/api';

export function useRoadRoutePositions(basePositions, shouldRoute = true) {
  const positionsKey = useMemo(() => getPositionsKey(basePositions), [basePositions]);
  const [roadPositions, setRoadPositions] = useState(basePositions);

  useEffect(() => {
    if (!shouldRoute || basePositions.length < 2) {
      setRoadPositions(basePositions);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    setRoadPositions(basePositions);

    fetchRoadRoutePositions(basePositions, controller.signal)
      .then((positions) => {
        if (!cancelled) setRoadPositions(positions);
      })
      .catch((error) => {
        if (!cancelled && error.name !== 'AbortError') {
          setRoadPositions(basePositions);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [positionsKey, basePositions, shouldRoute]);

  return roadPositions;
}
