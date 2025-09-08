import { DataPoint } from '@/config/dataPoints'; // Use the primary DataPoint type
import { HelpCircle, LucideIcon } from 'lucide-react';
import { ThreePhaseGroupInfo } from './dashboardInterfaces'; // Ensure this path is correct

export function groupDataPoints(pointsToGroup: DataPoint[]): { threePhaseGroups: ThreePhaseGroupInfo[], individualPoints: DataPoint[] } {
    const groupsByKey = new Map<string, DataPoint[]>(); // Store points using their original type
    const individualPoints: DataPoint[] = [];
    const threePhaseGroups: ThreePhaseGroupInfo[] = [];

    pointsToGroup.forEach(point => {
        const canBeGrouped =
            point.category === 'three-phase' && // Assuming 'three-phase' is a valid DataPoint['category']
            !!(point as any).threePhaseGroup &&
            (point as any).phase && ['a', 'b', 'c'].includes(((point as any).phase as string).toLowerCase()) &&
            !(point as any).isSinglePhase &&
            (point.uiType === 'display' || point.uiType === 'gauge');

        if (canBeGrouped && (point as any).threePhaseGroup) {
            const groupKey = `${(point as any).threePhaseGroup}-${point.uiType}`;
            if (!groupsByKey.has(groupKey)) {
                 groupsByKey.set(groupKey, []);
            }
            groupsByKey.get(groupKey)?.push(point);
        } else {
            individualPoints.push(point);
        }
    });

    groupsByKey.forEach((potentialGroup, groupKeyWithType) => {
        const phases: { a?: DataPoint, b?: DataPoint, c?: DataPoint } = {}; // Use DataPoint type
        let validGroup = true;
        let commonUiType: 'display' | 'gauge' | null = null; // Consistent with DataPoint['uiType']
        let commonUnit: string | undefined = undefined;
        let icon: LucideIcon | undefined = undefined;
        let description: string | undefined = undefined;
        let title: string = groupKeyWithType.split('-')[0];
        let representativePoint: DataPoint | null = null; // Use DataPoint type

        if (potentialGroup.length < 2 || potentialGroup.length > 3) {
             validGroup = false;
        } else {
            representativePoint = potentialGroup.find(p => (((p as any).phase as string)?.toLowerCase() === 'a')) || potentialGroup[0];
            // Ensure representativePoint.uiType can be safely casted
            if (representativePoint.uiType === 'display' || representativePoint.uiType === 'gauge') {
                commonUiType = representativePoint.uiType;
            } else {
                // Handle cases where uiType might not be 'display' or 'gauge' if that's possible
                // For now, assume it will be one of these based on `canBeGrouped` logic
                validGroup = false; // Or assign a default commonUiType / handle error
            }
            commonUnit = representativePoint.unit;
            // Ensure point.icon is compatible with LucideIcon or provide a default
            icon = (pointIsLucideIcon(representativePoint.icon) ? representativePoint.icon : HelpCircle) as LucideIcon;
            title = representativePoint.name || title;
            title = title
                .replace(/ Phase [ABC]$/i, '')
                .replace(/ Ph [ABC]$/i, '')
                .replace(/ L[123]$/i, '')
                .replace(/[ _-][abc]$/i, '')
                .replace(/ \(Precise\)$/i, '')
                .replace(/ Phase$/i, '')
                .trim();
            description = representativePoint.description?.replace(/ Phase [ABC]/i, '').replace(/ L[123]/i, '')
                .replace(/ \(high precision\)/i, '').trim() || `3-Phase ${title}`;

            if (validGroup) { // Only proceed if commonUiType was set
                for (const point of potentialGroup) {
                    const phase = ((point as any).phase as string)?.toLowerCase() as 'a' | 'b' | 'c';
                    if (!phase || !['a', 'b', 'c'].includes(phase) || phases[phase] ||
                        (point as any).threePhaseGroup !== (representativePoint as any).threePhaseGroup ||
                        point.uiType !== commonUiType) {
                        validGroup = false;
                        break;
                    }
                    phases[phase] = point;
                }
            }

            const foundPhasesCount = Object.values(phases).filter(p => p !== undefined).length;
            if (foundPhasesCount < 2) {
                validGroup = false;
            }
        }

        if (validGroup && commonUiType && representativePoint && icon) {
            threePhaseGroups.push({
                groupKey: (representativePoint as any).threePhaseGroup!,
                title,
                points: phases,
                icon,
                unit: commonUnit,
                description, // This is now valid
                // Cast commonUiType to the more restrictive type expected by ThreePhaseGroupInfo if needed
                uiType: commonUiType as ThreePhaseGroupInfo['uiType'],
                config: representativePoint,
                originalIds: potentialGroup.map(p => p.id), // Added back assuming it's required
            });
        } else {
            console.warn(`Invalid or incomplete 3-phase group found for key ${groupKeyWithType}. Points will be treated individually.`, potentialGroup);
            individualPoints.push(...potentialGroup);
        }
    });

    const uniqueIndividualPoints = Array.from(new Map(individualPoints.map(p => [p.id, p])).values());

    return { threePhaseGroups, individualPoints: uniqueIndividualPoints };
}

// Helper type guard for icons (if DataPoint['icon'] can be something other than LucideIcon)
function pointIsLucideIcon(icon: any): icon is LucideIcon {
    // Implement a check if necessary, e.g., if icon is a function component:
    // return typeof icon === 'function';
    // For this example, we'll assume it's compatible if it exists.
    // A more robust check might involve looking for specific properties of LucideIcon components
    // or if your IconComponentType has a way to identify LucideIcons.
    return !!icon; // Simple check for now
}