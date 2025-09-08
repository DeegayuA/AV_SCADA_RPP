// app/circuit/sld/ui/embedded/MiniGauge.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniGaugeProps {
  /** The current value of the gauge. */
  value: number;
  /** The minimum value of the gauge. Defaults to 0. */
  min?: number;
  /** The maximum value of the gauge. Defaults to 100. */
  max?: number;
  /** The width of the gauge in pixels. Defaults to 40. */
  width?: number;
  /** The height of the gauge in pixels. Defaults to 8. */
  height?: number;
  /** Tailwind CSS class for the filled bar color. Defaults to 'bg-sky-500' for better default visibility. */
  barColor?: string;
  /** Tailwind CSS class for the track color. Defaults to 'bg-neutral-200 dark:bg-neutral-700'. */
  trackColor?: string;
  /** Whether to display the value as text in the center of the gauge. Defaults to false. */
  showValueText?: boolean;
  /**
   * Optional function to format the displayed value text.
   * Also used for the default tooltip if `title` prop is not provided.
   * If not provided, value is shown as integer (e.g., `value.toFixed(0)`).
   */
  valueTextFormatter?: (value: number) => string;
  /**
   * Tailwind CSS class for the value text color (e.g., 'text-white', 'text-red-500').
   * If not provided and showValueText is true:
   * - It defaults to a color contrasting the `trackColor` (e.g., dark text on light track, light text on dark track).
   * - If `percentage > 55%`, it attempts `text-white`, assuming `barColor` is dark enough for contrast.
   * For best results with custom `barColor`, explicitly provide `valueTextColor`.
   */
  valueTextColor?: string;
  /** Whether the gauge is in a loading state. Defaults to false. */
  isLoading?: boolean;
  /** Additional CSS classes to apply to the gauge container. */
  className?: string;
  /**
   * Optional text or ReactNode to be displayed as a tooltip on hover.
   * If not provided, a default title showing formatted value and percentage will be generated.
   * To disable the title entirely, pass an empty string or null.
   */
  title?: string | null;
}

const MiniGauge: React.FC<MiniGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  width = 40,
  height = 8,
  barColor = 'bg-sky-500', // Changed default to a common, visible color
  trackColor = 'bg-neutral-200 dark:bg-neutral-700',
  showValueText = false,
  valueTextFormatter,
  valueTextColor,
  isLoading = false,
  className,
  title,
}) => {
  const safeValue = Math.max(min, Math.min(max, value));
  const percentage = max > min ? ((safeValue - min) / (max - min)) * 100 : 0;

  const formattedValueForDisplay = valueTextFormatter
    ? valueTextFormatter(value)
    : showValueText
    ? value.toFixed(0)
    : '';

  const generatedTitleText = valueTextFormatter
    ? valueTextFormatter(value) // If formatter exists, use it for tooltip as well
    : `Value: ${value.toFixed(1)}${max > min && max !== 100 ? ` / ${max}` : ''} (${percentage.toFixed(0)}%)`;
  
  const effectiveTitle = title === undefined ? generatedTitleText : title || ''; // Use provided title, or generated, or empty if title is null/empty string

  if (isLoading) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden",
          trackColor,
          "opacity-60", // Dimmed track during loading
          className
        )}
        style={{ width: `${width}px`, height: `${height}px` }}
        title="Loading..." // Specific title for loading state
        aria-busy="true"
        aria-live="polite" // Announce loading status change
        aria-label="Gauge loading"
      >
        {showValueText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="h-[60%] w-1/3 bg-muted-foreground/30 rounded-sm" // Subtle pulsing placeholder for text
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    );
  }

  let determinedValueTextColor = valueTextColor;
  if (!determinedValueTextColor && showValueText) {
    // Default: contrast with trackColor. This is usually good for text when the bar is small.
    determinedValueTextColor = 'text-neutral-800 dark:text-neutral-100';
    // Heuristic: If bar is more than half-filled, assume barColor is dominant and potentially dark. Try white text.
    // This is a heuristic and might need `valueTextColor` prop for specific `barColor` values.
    if (percentage > 55) {
      determinedValueTextColor = 'text-white';
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden group", // 'group' for potential parent-driven hover styles
        trackColor,
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
      title={effectiveTitle} // Use the determined title
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={effectiveTitle || `Gauge with value ${safeValue}`}
    >
      <motion.div
        className={cn(
          "absolute top-0 left-0 h-full",
          barColor,
          // Ensure proper rounding: left is always rounded. Right rounds when bar is full.
          (percentage > 0 ? 'rounded-l-full' : ''), // Only round left if there's some fill to avoid tiny dot artifact on 0%
          (percentage >= 99.9 ? 'rounded-r-full' : '')
        )}
        initial={{ width: '0%' }}
        animate={{ width: `${percentage}%` }}
        transition={{ type: 'spring', stiffness: 170, damping: 22, duration: 0.3 }} // Slightly adjusted spring
      />
      {showValueText && formattedValueForDisplay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.span
              key={formattedValueForDisplay} // Animates when text content changes
              className={cn(
                "font-medium leading-none tracking-tight", // tracking-tight helps for tiny fonts
                determinedValueTextColor
              )}
              // Dynamically adjust font size based on gauge height, with a minimum of 6px.
              style={{ fontSize: `${Math.max(Math.floor(height * 0.7), 6)}px` }}
              initial={{ opacity: 0, y: 2, scale: 0.95 }} // Subtle entry animation
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -2, scale: 0.95, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              {formattedValueForDisplay}
            </motion.span>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default React.memo(MiniGauge);