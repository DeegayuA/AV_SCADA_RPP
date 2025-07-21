// utils/windDataGenerator.ts

export interface SimulatedPoint {
    timestamp: number;
    value: number;
}

// Generates a somewhat realistic wind curve for a given day
export const generateDailyWindCurve = (
    date: Date,
    peakGenerationKW: number,
    pointsPerHour: number = 4 // e.g., 4 points = every 15 minutes
): SimulatedPoint[] => {
    const curve: SimulatedPoint[] = [];
    const  targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Start of the day

    for (let hour = 0; hour < 24; hour += (1 / pointsPerHour)) {
        const currentTimestamp = new Date(targetDate).setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        let generation = 0;

        // Simulate wind variability with some randomness
        const baseWind = Math.sin(hour * Math.PI / 12) * 0.5 + 0.5; // A daily cycle
        const gust = (Math.random() - 0.5) * 0.4; // Random gusts
        const windFactor = Math.max(0, baseWind + gust);

        generation = peakGenerationKW * windFactor;
        generation += (Math.random() - 0.5) * (peakGenerationKW * 0.1); // +/- 5% fluctuation
        generation = Math.max(0, parseFloat(generation.toFixed(2)));

        curve.push({ timestamp: currentTimestamp, value: generation });
    }
    return curve;
};

// Simulates fetching a range of historical data for the graph based on a timescale
export const getSimulatedHistoricalWindData = (
    timeScale: string, // 'day', '6h', '1h', etc.
    endDate: Date,     // Usually 'now' for the rightmost point of the graph
    peakWindKW: number,
): { generation: SimulatedPoint[]; } => {

    let durationMs;
    let pointsPerHour;

    switch (timeScale) {
        case 'day':
            durationMs = 24 * 60 * 60 * 1000;
            pointsPerHour = 2; // Every 30 mins for full day view to keep points manageable
            return {
                generation: generateDailyWindCurve(endDate, peakWindKW, pointsPerHour)
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
    const startDate = new Date(endDate.getTime() - durationMs);

    const dailyWindCache: Record<string, SimulatedPoint[]> = {};

    for (let t = startDate.getTime(); t <= endDate.getTime(); t += (60 * 60 * 1000) / pointsPerHour) {
        const currentPointDate = new Date(t);
        const dayKey = currentPointDate.toDateString();

        if (!dailyWindCache[dayKey]) {
            dailyWindCache[dayKey] = generateDailyWindCurve(currentPointDate, peakWindKW, 2); // Generate with fewer points for backend cache
        }

        // Find the closest pre-generated wind point
        const windVal = dailyWindCache[dayKey].reduce((prev, curr) => {
            return (Math.abs(curr.timestamp - t) < Math.abs(prev.timestamp - t) ? curr : prev);
        }).value;

        generation.push({ timestamp: t, value: windVal });
    }
    return { generation };
};
