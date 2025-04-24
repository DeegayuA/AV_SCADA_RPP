import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { HelpCircle } from 'lucide-react'; // Import necessary icons
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon as a type
import { ThreePhaseGroupInfo } from './dashboardInterfaces';

export function groupDataPoints(pointsToGroup: DataPointConfig[]): { threePhaseGroups: ThreePhaseGroupInfo[], individualPoints: DataPointConfig[] } {
    const groupsByKey = new Map<string, DataPointConfig[]>();
    const individualPoints: DataPointConfig[] = [];
    const threePhaseGroups: ThreePhaseGroupInfo[] = [];

    pointsToGroup.forEach(point => {
        // Only group if explictly marked as 'three-phase' category, has a group key, phase, etc.
        const canBeGrouped =
            point.category === 'three-phase' &&
            !!point.threePhaseGroup &&
            point.phase && ['a', 'b', 'c'].includes(point.phase.toLowerCase()) && // Case-insensitive phase check
            !point.isSinglePhase && // Ensure it's not explicitly single phase
            (point.uiType === 'display' || point.uiType === 'gauge');

        if (canBeGrouped && point.threePhaseGroup) {
            // Use lower case phase for consistent grouping keys within the map
            const phaseKey = point.phase?.toLowerCase() as 'a' | 'b' | 'c' | undefined;
            const groupKey = `${point.threePhaseGroup}-${point.uiType}`; // Group by key AND uiType
            if (!groupsByKey.has(groupKey)) {
                 groupsByKey.set(groupKey, []);
            }
            groupsByKey.get(groupKey)?.push(point);
        } else {
            individualPoints.push(point);
        }
    });

    groupsByKey.forEach((potentialGroup, groupKeyWithType) => {
        const phases: { a?: DataPointConfig, b?: DataPointConfig, c?: DataPointConfig } = {};
        let validGroup = true;
        let commonUiType: 'display' | 'gauge' | null = null;
        let commonUnit: string | undefined = undefined;
        let icon: LucideIcon | undefined = undefined;
        let description: string | undefined = undefined;
        let title: string = groupKeyWithType.split('-')[0]; // Default title from key
        let representativePoint: DataPointConfig | null = null;

        // Minimum 2 phases required for a valid 3-phase group display
        if (potentialGroup.length < 2 || potentialGroup.length > 3) {
             validGroup = false;
        } else {
            // Find a representative point to extract common properties
            representativePoint = potentialGroup.find(p => p.phase?.toLowerCase() === 'a') || potentialGroup[0];
            commonUiType = representativePoint.uiType as 'display' | 'gauge';
            commonUnit = representativePoint.unit;
            icon = representativePoint.icon || HelpCircle;
            title = representativePoint.name || title; // Use name if available, fallback to key
            // Clean up common naming patterns from the title
             title = title
                .replace(/ Phase [ABC]$/i, '')
                .replace(/ Ph [ABC]$/i, '')
                .replace(/ L[123]$/i, '')
                .replace(/[ _-][abc]$/i, '')
                .replace(/ \(Precise\)$/i, '') // Remove specific precision indicator if present
                .replace(/ Phase$/i, '') // Remove general "Phase" suffix
                .trim();
             // Clean up description similarly
             description = representativePoint.description?.replace(/ Phase [ABC]/i, '').replace(/ L[123]/i, '')
                .replace(/ \(high precision\)/i, '').trim() || `3-Phase ${title}`; // Default description


            for (const point of potentialGroup) {
                const phase = point.phase?.toLowerCase() as 'a' | 'b' | 'c';
                if (!phase || !['a', 'b', 'c'].includes(phase) || phases[phase] ||
                    point.threePhaseGroup !== representativePoint.threePhaseGroup || // Check group key consistency
                    point.uiType !== commonUiType // Check uiType consistency
                    // Removed unit consistency check as phases might report different units sometimes,
                    // but the group card uses the commonUnit. Re-add if strict consistency is required.
                    ) {
                    validGroup = false;
                    break;
                }
                phases[phase] = point;
            }

             // Ensure at least two distinct phases were found
             const foundPhasesCount = Object.values(phases).filter(p => p !== undefined).length;
             if (foundPhasesCount < 2) {
                 validGroup = false;
             }
        }

        if (validGroup && commonUiType && representativePoint && icon) {
            threePhaseGroups.push({
                groupKey: representativePoint.threePhaseGroup!, // Use original group key
                title,
                points: phases,
                icon,
                unit: commonUnit,
                description,
                uiType: commonUiType,
                config: representativePoint, // Pass the representative config
            });
        } else {
            // If a group is invalid, push its points back to individual points
            console.warn(`Invalid or incomplete 3-phase group found for key ${groupKeyWithType}. Points will be treated individually.`, potentialGroup);
            individualPoints.push(...potentialGroup);
        }
    });

    // Ensure individual points are unique after potentially adding back invalid group points
    const uniqueIndividualPoints = Array.from(new Map(individualPoints.map(p => [p.id, p])).values());

    return { threePhaseGroups, individualPoints: uniqueIndividualPoints };
}