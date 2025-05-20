// src/components/DashboardData/controlGridConfig.ts
import { DataPoint } from '@/config/dataPoints';
import { ThreePhaseGroupInfo } from '../DashboardData/dashboardInterfaces';
import ReactGridLayout from "react-grid-layout";


export type WidgetContentType = 'dataPoint' | 'threePhaseGroup' | 'header';

export interface BaseWidgetContent {
    type: WidgetContentType;
}

export interface DataPointWidgetContent extends BaseWidgetContent {
    type: 'dataPoint';
    data: DataPoint;
}

export interface ThreePhaseGroupWidgetContent extends BaseWidgetContent {
    type: 'threePhaseGroup';
    data: ThreePhaseGroupInfo;
}

export interface HeaderWidgetContent extends BaseWidgetContent {
    type: 'header';
    title: string;
}

export type WidgetContent = DataPointWidgetContent | ThreePhaseGroupWidgetContent | HeaderWidgetContent;

export interface DashboardGridWidgetItem {
    id: string; // Unique ID for the widget (dp.id, group.groupKey, or generated)
    content: WidgetContent;
}

// Default layout properties for new items
// These are examples, you might want different defaults
export const DEFAULT_WIDGET_WIDTH = 2; // In grid units
export const DEFAULT_WIDGET_HEIGHT = {
    dataPoint: 2,       // Example: DataPoint card might be taller
    threePhaseGroup: 3, // Example: Group card might be even taller
    header: 1,          // Example: Header is shorter
};
export const GRID_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }; // Responsive breakpoints for react-grid-layout
export const GRID_ROW_HEIGHT = 100; // pixels

// Function to find the next available position (simplified)
export const findNextAvailablePosition = (layout: ReactGridLayout.Layout[], newWidgetW: number, newWidgetH: number, cols: number): { x: number; y: number } => {
    const occupied = new Array(1000).fill(null).map(() => new Array(cols).fill(false)); // Max Y, practical limit
    layout.forEach(item => {
        for (let y = item.y; y < item.y + item.h; y++) {
            for (let x = item.x; x < item.x + item.w; x++) {
                if (y < 1000 && x < cols) occupied[y][x] = true;
            }
        }
    });

    for (let y = 0; y < 1000; y++) {
        for (let x = 0; x <= cols - newWidgetW; x++) {
            let canPlace = true;
            for (let yy = 0; yy < newWidgetH; yy++) {
                for (let xx = 0; xx < newWidgetW; xx++) {
                    if (y + yy >= 1000 || x + xx >= cols || occupied[y + yy][x + xx]) {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
            if (canPlace) return { x, y };
        }
    }
    return { x: 0, y: Infinity }; // Fallback, place at bottom
};