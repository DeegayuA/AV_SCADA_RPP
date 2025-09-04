import { Zap, Wind, Sun, Battery, Waves } from 'lucide-react';

// Defines the structure for price information per unit of energy.
export interface UnitPrice {
  LKR: number; // Sri Lankan Rupee
  USD: number; // US Dollar
  GBP: number; // British Pound
  EUR: number; // Euro
}

// Defines the structure for a single generation category.
export interface GenerationCategory {
  id: string; // e.g., 'solar', 'wind'
  label: string; // e.g., 'Solar', 'Wind'
  icon: React.ComponentType<any>; // Icon component, e.g., Sun
  dataPointIds: string[]; // IDs of data points belonging to this category
  color: string; // Color for the graph line
}

// Main configuration for the Power Timeline graph.
export interface TimelineConfig {
  historicalApiUrl: string; // API endpoint for fetching historical data
  unitPrice: UnitPrice; // Price per unit of energy in different currencies
  currency: keyof UnitPrice; // The currently active currency
  generationCategories: GenerationCategory[]; // Array of generation categories
  // Add other timeline-specific configurations here as needed
}

// Example configuration for the Power Timeline.
export const timelineConfig: TimelineConfig = {
  historicalApiUrl: 'http://localhost:8900/read-range-raw/',
  unitPrice: {
    LKR: 50.0,
    USD: 0.15,
    GBP: 0.12,
    EUR: 0.14,
  },
  currency: 'LKR',
  generationCategories: [
    {
      id: 'solar',
      label: 'Solar',
      icon: Sun,
      dataPointIds: ['pv1-power', 'pv2-power'], // Example data point IDs
      color: 'hsl(var(--chart-1))',
    },
    {
      id: 'wind',
      label: 'Wind',
      icon: Wind,
      dataPointIds: [], // To be configured
      color: 'hsl(var(--chart-2))',
    },
    {
      id: 'generator',
      label: 'Generator',
      icon: Zap,
      dataPointIds: [], // To be configured
      color: 'hsl(var(--chart-3))',
    },
    {
        id: 'grid',
        label: 'Grid',
        icon: Waves,
        dataPointIds: [], // To be configured
        color: 'hsl(var(--chart-4))',
    },
    {
        id: 'battery',
        label: 'Battery',
        icon: Battery,
        dataPointIds: [], // To be configured
        color: 'hsl(var(--chart-5))',
    }
  ],
};
