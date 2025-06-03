// app/circuit/sld/ui/embedded/EmbeddedValueDisplay.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EmbeddedValueDisplayProps {
  value: string | number | boolean;
  label?: string;
  unit?: string;
  valueFontSize?: string;
  labelFontSize?: string;
  textColor?: string;
  isLoading?: boolean;
  className?: string;
}

const EmbeddedValueDisplay: React.FC<EmbeddedValueDisplayProps> = ({
  value,
  label,
  unit,
  valueFontSize = 'text-[10px]', // Small value text by default for "embedded" feel
  labelFontSize = 'text-[9px]',  // Even smaller label/unit text
  textColor,
  isLoading = false,
  className,
}) => {
  const baseTextColorClass = textColor || 'text-inherit'; // Inherit if no specific color

  if (isLoading) {
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        {label && (
          <span className={cn(labelFontSize, baseTextColorClass, "opacity-50")}>
            {label}
          </span>
        )}
        {/* Pulsing placeholder for value */}
        <span
          className={cn(
            valueFontSize,
            "font-semibold inline-block align-baseline",
            "bg-muted-foreground/20 dark:bg-muted/30 animate-pulse rounded-sm",
          )}
          style={{ 
            minWidth: '2em', // Approx width of a few characters like "888"
            height: '1em', // Match approximate height of text
            lineHeight: '1', // Prevent extra space if font makes it taller
           }}
        > </span> 
        {unit && (
          <span className={cn(labelFontSize, baseTextColorClass, "ml-0.5 opacity-50")}>
            {unit}
          </span>
        )}
      </div>
    );
  }

  const valueKey = String(value) + (unit || ''); // Ensure key changes if unit changes too with same value

  return (
    <div 
      className={cn("flex items-baseline gap-1", className)} 
      title={`${label || ''} ${String(value)} ${unit || ''}`.trim()}
    >
      {label && (
        <span className={cn(labelFontSize, baseTextColorClass, "opacity-80")}>
          {label}
        </span>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={valueKey} // Unique key for AnimatePresence to detect changes
          className={cn(valueFontSize, "font-semibold", baseTextColorClass)}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {String(value)}
        </motion.span>
      </AnimatePresence>
      {unit && (
        <span className={cn(labelFontSize, baseTextColorClass, "ml-0.5 opacity-80")}>
          {unit}
        </span>
      )}
    </div>
  );
};

export default React.memo(EmbeddedValueDisplay);