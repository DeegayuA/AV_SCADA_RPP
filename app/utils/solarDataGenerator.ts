// utils/solarDataGenerator.ts

export interface SimulatedPoint {
    timestamp: number;
    value: number;
}

// Generates a somewhat realistic solar curve for a given day
// Peaks at solar noon (around 12:30 PM for simulation ease)
// Active from approx 6:30 AM to 6:30 PM
export const generateDailySolarCurve = (
    date: Date,
    peakGenerationKW: number,
    pointsPerHour: number = 4 // e.g., 4 points = every 15 minutes
): SimulatedPoint[] => {
    const curve: SimulatedPoint[] = [];
    const dayStartHour = 6.5; // 6:30 AM
    const dayEndHour = 18.5;   // 6:30 PM
    const solarNoonHour = 12.5; // Peak time

    const  targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Start of the day

    for (let hour = 0; hour < 24; hour += (1 / pointsPerHour)) {
        const currentTimestamp = new Date(targetDate).setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        let generation = 0;

        if (hour >= dayStartHour && hour <= dayEndHour) {
            // Simple parabolic curve, scaled and shifted
            const x = (hour - solarNoonHour) / (solarNoonHour - dayStartHour); // Normalize hour relative to peak
            // generation = peakGenerationKW * Math.max(0, 1 - x * x); // Symmetrical parabola
            
            // Asymmetrical bell curve using Gaussian-like function for more realism
            const spread = (solarNoonHour - dayStartHour) / 2.5; // Controls width of the curve
            generation = peakGenerationKW * Math.exp(-Math.pow(hour - solarNoonHour, 2) / (2 * Math.pow(spread, 2)));

            // Add some minor random fluctuations
            generation += (Math.random() - 0.5) * (peakGenerationKW * 0.05); // +/- 2.5% fluctuation
            generation = Math.max(0, parseFloat(generation.toFixed(2)));
        }
        curve.push({ timestamp: currentTimestamp, value: generation });
    }
    return curve;
};

// Generates somewhat realistic usage data
export const generateUsageData = (
    timestamp: number,
    baseUsageKW: number = 5,
    variationKW: number = 2
): number => {
    const date = new Date(timestamp);
    const hour = date.getHours() + date.getMinutes() / 60;
    let usage = baseUsageKW;

    // Morning and evening peaks
    if ((hour > 7 && hour < 10) || (hour > 18 && hour < 21)) {
        usage += Math.random() * variationKW;
    } else {
        usage -= Math.random() * (variationKW / 2);
    }
    // General random fluctuation
    usage += (Math.random() - 0.5) * (baseUsageKW * 0.1);
    return Math.max(0.5, parseFloat(usage.toFixed(2))); // Min usage 0.5 kW
};


// Simulates fetching a range of historical data for the graph based on a timescale
export const getSimulatedHistoricalData = (
    timeScale: string, // 'day', '6h', '1h', etc.
    endDate: Date,     // Usually 'now' for the rightmost point of the graph
    peakSolarKW: number,
    baseUsageKW: number
): { generation: SimulatedPoint[]; usage: SimulatedPoint[]; } => {
    
    let durationMs;
    let pointsPerHour;

    switch (timeScale) {
        case 'day':
            durationMs = 24 * 60 * 60 * 1000;
            pointsPerHour = 2; // Every 30 mins for full day view to keep points manageable
            return {
                generation: generateDailySolarCurve(endDate, peakSolarKW, pointsPerHour),
                usage: generateDailySolarCurve(endDate, peakSolarKW, pointsPerHour).map(p => ({
                    timestamp: p.timestamp,
                    value: generateUsageData(p.timestamp, baseUsageKW)
                }))
            };
        case '6h':
            durationMs = 6 * 60 * 60 * 1000;
            pointsPerHour = 4; // Every 15 mins
            break;
        case '1h':
            durationMs = 1 * 60 * 60 * 1000;
            pointsPerHour = 12; // Every 5 mins
            break;
        case '30m':
            durationMs = 30 * 60 * 1000;
            pointsPerHour = 30; // Every 2 mins
            break;
        case '5m':
        case '1m':
        default:
            durationMs = 5 * 60 * 1000; // For 1m and 5m, fetch 5m of data
            pointsPerHour = 60; // Every 1 min
            break;
    }

    const generation: SimulatedPoint[] = [];
    const usage: SimulatedPoint[] = [];
    const startDate = new Date(endDate.getTime() - durationMs);

    const dailySolarCache: Record<string, SimulatedPoint[]> = {};

    for (let t = startDate.getTime(); t <= endDate.getTime(); t += (60 * 60 * 1000) / pointsPerHour) {
        const currentPointDate = new Date(t);
        const dayKey = currentPointDate.toDateString();

        if (!dailySolarCache[dayKey]) {
            dailySolarCache[dayKey] = generateDailySolarCurve(currentPointDate, peakSolarKW, 2); // Generate with fewer points for backend cache
        }
        
        // Find the closest pre-generated solar point
        const solarVal = dailySolarCache[dayKey].reduce((prev, curr) => {
            return (Math.abs(curr.timestamp - t) < Math.abs(prev.timestamp - t) ? curr : prev);
        }).value;
        
        generation.push({ timestamp: t, value: solarVal });
        usage.push({ timestamp: t, value: generateUsageData(t, baseUsageKW) });
    }
    return { generation, usage };
};