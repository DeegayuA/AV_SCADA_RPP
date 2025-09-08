// src/utils/dataPointMatcher.ts

import { DataPoint } from "@/config/dataPoints";
import { SearchCriteria } from "@/config/desiredDataPointsConfig";


function calculateScore(dp: DataPoint, criteria: SearchCriteria): number {
    let score = 0;
  
    // Highest priority: nodeId match (still useful if provided for a very specific known point)
    if (criteria.nodeId && dp.nodeId === criteria.nodeId) {
      score += 1000;
    }
  
    // DataType match
    if (criteria.dataType && dp.dataType === criteria.dataType) {
      score += 50;
    }
  
    // Unit match
    if (criteria.unit && dp.unit?.toLowerCase() === criteria.unit.toLowerCase()) {
      score += 50;
    }
  
    // Category match
    if (criteria.category && dp.category) {
      const categories = Array.isArray(criteria.category) ? criteria.category : [criteria.category];
      if (categories.filter((c): c is string => typeof c === 'string').map(c => c.toLowerCase()).includes(dp.category.toLowerCase())) { // case-insensitive category match
        score += 40;
      }
    }
  
    // Phase match
    if (criteria.phase && criteria.phase !== 'any' && (dp as DataPoint & { phase?: string }).phase === criteria.phase) {
      score += 30;
    }
  
    // Preferred UI Type match
    if (criteria.preferredUiTypes && criteria.preferredUiTypes.includes(dp.uiType)) {
      score += 25; // Bonus for matching preferred UI visualization
    }
  
    // Keyword matches
    const searchText = `${dp.name.toLowerCase()} ${dp.id.toLowerCase()} ${dp.description?.toLowerCase() || ''}`;
    criteria.keywords.forEach(keyword => {
      if (typeof keyword === 'string') {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 10;
          if (dp.name.toLowerCase().includes(keyword.toLowerCase())) score += 10; // Stronger bonus for name
          if (dp.id.toLowerCase().includes(keyword.toLowerCase())) score += 5;
        }
      } else { // RegExp
        if (keyword.test(searchText)) {
          score += 15;
          if (keyword.test(dp.name)) score += 15; // Stronger bonus for name
          if (keyword.test(dp.id)) score += 7;
        }
      }
    });
  
    // Penalize if it looks like a setting/control when we usually want a measurement,
    // unless keywords explicitly ask for settings.
    const wantsSetting = criteria.keywords.some(k => /setting|limit|config|control|adjust/i.test(k.toString()));
    const isMeasurementType = dp.uiType === 'display' || dp.uiType === 'gauge';
  
    if (!wantsSetting && !isMeasurementType) {
      score -= 30; // If we're likely looking for a display/gauge value but dp isn't.
    }
    // If the name/id strongly implies a setting and we don't want one
    if (!wantsSetting && (/setting|limit|config|control|adjust/i.test(dp.name.toLowerCase()) || /setting|limit|config|control|adjust/i.test(dp.id.toLowerCase()))) {
      score -= 25;
    }
  
  
    // If looking for phase 'any', slightly prefer 'a','b','c' over 'x' if keywords didn't pick total
    // This is tricky, 'x' can be 'total' which is good.
    if (criteria.phase === 'any' && !criteria.keywords.some(k => /total/i.test(k.toString()))) {
        if ((dp as DataPoint & { phase?: string }).phase === 'x') score -=5; // Slight penalization if not explicitly looking for total.
    }
  
  
    return score;
  }
  // src/utils/dataPointMatcher.ts

// ... (calculateScore function remains the same as your provided one) ...

export function findBestMatch(
    allPossibleDataPoints: DataPoint[],
    criteria: SearchCriteria
  ): DataPoint | undefined {
    let bestMatch: DataPoint | undefined = undefined;
    let highestScore = -1; // Start with -1 to ensure any positive score is higher
  
    for (const dp of allPossibleDataPoints) {
      // Stricter phase filtering for findBestMatch WHEN a specific phase is requested.
      // If criteria.phase is 'a', 'b', or 'c', then dp.phase must match.
      // If criteria.phase is 'x', then dp.phase must be 'x'.
      // If criteria.phase is 'any' or undefined, this specific filter doesn't apply here,
      // and keywords/other criteria determine suitability.
      if (criteria.phase && criteria.phase !== 'any') {
          if ((dp as DataPoint & { phase?: string }).phase !== criteria.phase) {
              continue; // Skip if specific phase requested doesn't match DP's phase
          }
      }
  
      const score = calculateScore(dp, criteria);
      if (score > highestScore) { // Only update if score is strictly greater
        // For tie-breaking (if needed), you could add more rules here or rely on data order
        highestScore = score;
        bestMatch = dp;
      }
    }
    if (highestScore < 20 && criteria.nodeId && bestMatch?.nodeId !== criteria.nodeId) { 
      // If overall score is low, and a nodeId was provided but didn't match, perhaps it's not a good match.
      // This is a heuristic to prevent weak keyword matches if a nodeId was a strong hint.
      // However, we allow nodeId to be just a strong boost. So, let's be careful.
      // For now, we take any best match as long as score > 0 (implicitly handled by highestScore > -1)
    }
    if (bestMatch) {
      // console.log(`Best match for criteria ('${criteria.descriptionHint}', phase: ${criteria.phase || 'any'}): ${bestMatch?.id} (score: ${highestScore})`);
    } else {
      // console.log(`No suitable match found for criteria ('${criteria.descriptionHint}', phase: ${criteria.phase || 'any'}) with score > 0`);
    }
    return bestMatch;
  }
  
  export function findMatches(
    allPossibleDataPoints: DataPoint[],
    criteria: SearchCriteria
  ): DataPoint[] {
    const scoredDataPoints = allPossibleDataPoints
      .map(dp => {
        let score = calculateScore(dp, criteria);
  
        // Phase filtering specifically for findMatches (can be more nuanced if needed)
        // If criteria.phase is 'a', 'b', or 'c', only matching DPs should get a good score or pass.
        if (criteria.phase && criteria.phase !== 'any') {
          if ((dp as DataPoint & { phase?: string }).phase !== criteria.phase) {
            score = 0; // Effectively filters out non-matching phases
          }
        }
        // If criteria.phase is 'any', we allow DPs with phase 'a', 'b', 'c', or 'x'.
        // Other dp.phase values (if any) would be less likely to match keywords for phase-specific things anyway.
        // The score already has a small penalty for 'x' if 'total' isn't a keyword for 'any' phase.
  
        return { dp, score };
      })
      .filter(item => item.score > 20) // Minimum score threshold for a "decent" match
      .sort((a, b) => b.score - a.score);
  
    // console.log(`All potential matches for criteria ('${criteria.descriptionHint}', phase: ${criteria.phase || 'any'}): ${scoredDataPoints.map(i => `${i.dp.id} (ph: ${(i.dp as DataPoint & { phase?: string }).phase}, score: ${i.score})`).join('; ')}`);
    
    const limit = criteria.limit || scoredDataPoints.length; // Use the criteria's limit
    return scoredDataPoints.slice(0, limit).map(item => item.dp);
  }