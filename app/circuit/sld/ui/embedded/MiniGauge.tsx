// app/circuit/sld/ui/embedded/MiniGauge.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface MiniGaugeProps {
  value: number;
  min?: number;
  max?: number;
  width?: number;
  height?: number;
  barColor?: string;
  trackColor?: string;
  showValueText?: boolean;
  valueTextFormatter?: (value: number) => string;
  isLoading?: boolean;
  className?: string;
}

const MiniGauge: React.FC<MiniGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  width = 40,
  height = 8,
  barColor = 'bg-primary',
  trackColor = 'bg-neutral-200 dark:bg-neutral-700',
  showValueText = false,
  valueTextFormatter,
  isLoading = false,
  className,
}) => {
  const safeValue = Math.max(min, Math.min(max, value));
  const percentage = (max > min) ? ((safeValue - min) / (max - min)) * 100 : 0;

  if (isLoading) {
    return (
      <div
        className={cn("relative rounded-full animate-pulse", trackColor, className)}
        style={{ width: `${width}px`, height: `${height}px` }}
        title="Loading..."
      >
        {showValueText && (
          <span className="absolute inset-0 flex items-center justify-center text-[7px] text-muted-foreground">...</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative rounded-full overflow-hidden", trackColor, className)}
      style={{ width: `${width}px`, height: `${height}px` }}
      title={valueTextFormatter ? valueTextFormatter(value) : `${value.toFixed(1)} (${percentage.toFixed(0)}%)`}
    >
      <div
        className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out", barColor)}
        style={{ width: `${percentage}%` }}
      />
      {showValueText && (
        <span 
          className="absolute inset-0 flex items-center justify-center text-[7px] font-medium text-white mix-blend-difference"
          // Alternative for better readability: dark text on light bar, light text on dark bar
          // style={{ color: percentage > 50 ? 'white' : 'black' }} 
        >
          {valueTextFormatter ? valueTextFormatter(value) : value.toFixed(0)}
        </span>
      )}
    </div>
  );
};
export default React.memo(MiniGauge);


