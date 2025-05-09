// In your component file, or a new utility like `src/utils/defaultDataPoints.ts`
import { useCallback } from 'react';
import { DataPoint } from '@/config/dataPoints'; // Adjust path
import { desiredDataPointsConfig, DesiredDataPointConfigEntry } from '@/config/desiredDataPointsConfig'; // Adjust path
import { findBestMatch, findMatches } from './dataPointMatcher'; // Adjust path

// This constant is now primarily for the absolute fallback if no dynamic matches are found.
const FALLBACK_DISPLAY_COUNT = 6;

export function useDynamicDefaultDataPointIds(allPossibleDataPoints: DataPoint[]) {
  const getDynamicDefaultDataPointIds = useCallback(() => {
    if (!allPossibleDataPoints || allPossibleDataPoints.length === 0) {
      console.warn("No possible data points provided to select defaults from.");
      return [];
    }

    const selectedIds = new Set<string>();
    // To maintain a semblance of order based on config, we can use an array
    // and then filter for uniqueness at the end, or rely on modern Set order.
    // For now, Set is fine and usually preserves insertion order.
    // Let's also store the found DataPoint objects for better logging/debugging potential later.
    const foundDataPoints: { configId: string, dp: DataPoint }[] = [];


    for (const configEntry of desiredDataPointsConfig) {
      const criteria = { ...configEntry.criteria };

      if (configEntry.isMultiPhaseGroup) {
        const groupLimit = criteria.limit || 3; // Default to 3 for phase groups (A,B,C)
        let foundForThisGroupCount = 0;

        // For 'any' phase, iterate through preferred phase order
        if (criteria.phase === 'any') {
          const phasePriorities: DataPoint['phase'][] = ['a', 'b', 'c'];
          // If the group explicitly has a limit > 3 and 'x' might be relevant (e.g., a 4th item for total)
          if (groupLimit > 3) { 
            phasePriorities.push('x'); // Add 'x' only if limit allows and it's contextually right
          }

          for (const specificPhase of phasePriorities) {
            if (foundForThisGroupCount >= groupLimit) break;

            // Create criteria for this specific phase
            const phaseSpecificCriteria = { ...criteria, phase: specificPhase, limit: 1 };
            const match = findBestMatch(allPossibleDataPoints, phaseSpecificCriteria);

            if (match && !selectedIds.has(match.id)) {
              selectedIds.add(match.id);
              foundDataPoints.push({ configId: configEntry.id, dp: match });
              foundForThisGroupCount++;
            }
          }
        } else if (criteria.phase) {
          // If a specific phase is requested for a group (less common but possible)
          const matches = findMatches(allPossibleDataPoints, criteria); // findMatches respects criteria.limit
          matches.forEach(match => {
            if (!selectedIds.has(match.id)) {
              selectedIds.add(match.id);
              foundDataPoints.push({ configId: configEntry.id, dp: match });
            }
          });
        }
      } else {
        // For single items (not multi-phase group)
        const bestMatch = findBestMatch(allPossibleDataPoints, criteria);
        if (bestMatch && !selectedIds.has(bestMatch.id)) {
          selectedIds.add(bestMatch.id);
          foundDataPoints.push({ configId: configEntry.id, dp: bestMatch });
        }
      }
    }

    let resultIds = Array.from(selectedIds);

    // Fallback: ONLY if the dynamic configuration yields ZERO results
    if (resultIds.length === 0 && allPossibleDataPoints.length > 0) {
      console.warn(
        "No specific default data points found through dynamic configuration. " +
        `Falling back to the first ${FALLBACK_DISPLAY_COUNT} generic data points.`
      );
      return allPossibleDataPoints.slice(0, FALLBACK_DISPLAY_COUNT).map(dp => dp.id);
    }
    
    // Log details about what was found for which configuration entry
    console.log("Found data points by configuration:", foundDataPoints.map(f => `${f.configId} -> ${f.dp.id} (Phase: ${f.dp.phase}, Score based on its group)`));
    console.log("Dynamically selected default IDs (count:", resultIds.length, "):", resultIds);

    return resultIds;
  }, [allPossibleDataPoints]);

  return getDynamicDefaultDataPointIds;
}