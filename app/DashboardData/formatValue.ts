import { DataPoint as DataPointConfig } from '@/config/dataPoints';

export function formatValue(val: number | null, config: DataPointConfig): string {
    if (val === null) return '--';

    // Handle Boolean or Int types representing ON/OFF
    if (config.dataType === 'Boolean' || (config.dataType?.includes('Int') && (val === 0 || val === 1) && (config.name.includes('Status') || config.name.includes('Switch') || config.name.includes('Enable') || config.name.includes('Key') || config.uiType === 'switch'))) {
        return val === 1 ? 'ON' : 'OFF';
    }

    // Handle specific enum-like values based on ID
    if (config.id === 'work-mode-status') {
        const modes: { [k: number]: string } = { 0: 'Standby', 1: 'Grid-tie', 2: 'Off-grid', 3: 'Fault', 4: 'Charging' };
        return modes[val] || `Code ${val}`;
    }
     if (config.id === 'run-state') {
        const states: { [k: number]: string } = { 0: 'Idle', 1: 'Self-Test', 2: 'Running', 3: 'Fault', 4: 'Derating', 5: 'Shutdown' };
        return states[val] || `State ${val}`;
    }

    // Default number formatting based on scale and type
    const absVal = Math.abs(val);
    let options: Intl.NumberFormatOptions = {};

    if (config.unit === '%' || config.dataType === 'Float' || config.dataType === 'Double') {
        // For percentages or floats, use more precision for small values
        if (absVal < 1 && absVal !== 0) options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        else if (absVal < 100) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
        else options = { maximumFractionDigits: 0 }; // Use 0 for larger values
    } else if (config.dataType?.includes('Int')) {
        options = { maximumFractionDigits: 0 }; // Integers usually don't need decimals
    } else {
         // General fallback formatting
        if (absVal < 10) options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
        else options = { maximumFractionDigits: 0 };
    }

    // Handle potential NaN or Infinity from factor multiplication
    if (!isFinite(val)) return '--';

    return val.toLocaleString(undefined, options);
}