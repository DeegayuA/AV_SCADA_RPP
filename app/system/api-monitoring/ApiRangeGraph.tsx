'use client';

import React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';
import { TimeSeriesData } from '@/lib/apiClient';
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ApiRangeGraphProps {
  apiData: TimeSeriesData[] | null;
  isLoading?: boolean;
  error?: string | null;
}

const ApiRangeGraph: React.FC<ApiRangeGraphProps> = ({ apiData, isLoading, error }) => {
  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading graph data...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading graph: {error}</div>;
  }

  if (!apiData || apiData.length === 0 || apiData.every(series => !series.values || series.values.length === 0)) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">No data available to display the graph.</div>;
  }

  const seriesToPlot = apiData.find(series => series.values && series.values.length > 0);

  if (!seriesToPlot || !seriesToPlot.values || seriesToPlot.values.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">No valid data series found or series is empty.</div>;
  }

  const chartData = seriesToPlot.values.map(point => ({
    timestamp: parseISO(point.timestamp),
    value: typeof point.value === 'number' ? point.value : null,
  })).filter(point => point.value !== null)
  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">No numerical data points to plot.</div>;
  }

  const chartConfig: ChartConfig = {
    value: {
      label: seriesToPlot.displayName || seriesToPlot.nodeId || 'Value',
      color: 'hsl(var(--chart-1))',
    },
  };
  
  const timeRange = chartData.length > 0 ? chartData[chartData.length - 1].timestamp.getTime() - chartData[0].timestamp.getTime() : 0;
  let tickFormat = "HH:mm";
  if (timeRange > 2 * 60 * 60 * 1000) { 
    tickFormat = "HH:mm";
  }
  if (timeRange > 24 * 60 * 60 * 1000) { 
    tickFormat = "MMM d, HH:mm";
  }
  if (timeRange > 30 * 24 * 60 * 60 * 1000) {
    tickFormat = "MMM d";
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 50, 
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(time) => format(time, tickFormat)}
          angle={-45}
          textAnchor="end"
          height={60}
          label={{ value: "Time", position: "insideBottom", offset: -50 }}
        />
        <YAxis
          dataKey="value"
          label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => typeof value === 'number' ? value.toFixed(2) : ''}
        />
        <ChartTooltip
            cursor={false}
            content={
                <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0 && payload[0].payload.timestamp) {
                           return format(payload[0].payload.timestamp, 'MMM d, yyyy HH:mm:ss');
                        }
                        return '';
                    }}
                    formatter={(value, name, props) => {
                         const itemPayload = props.payload || {};
                         const unit = "";
                         return [
                            `${typeof value === 'number' ? value.toLocaleString() : value} ${unit}`,
                            chartConfig.value.label || name
                        ];
                    }}
                    indicator="dot" 
                />
            } 
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          name={chartConfig.value.label as string || 'Value'}
        />
      </LineChart>
    </ChartContainer>
  );
};

export default ApiRangeGraph;
