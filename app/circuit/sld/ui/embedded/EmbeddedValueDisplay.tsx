// app/circuit/sld/ui/embedded/EmbeddedValueDisplay.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface EmbeddedValueDisplayProps {
  value: string | number | boolean;
  label?: string;
  unit?: string;
  valueFontSize?: string;
  labelFontSize?: string;
  textColor?: string;
  isLoading?: boolean;
  className?: string; // Allow parent to pass additional styling
}

const EmbeddedValueDisplay: React.FC<EmbeddedValueDisplayProps> = ({
  value,
  label,
  unit,
  valueFontSize = 'text-[10px]',
  labelFontSize = 'text-[9px]',
  textColor, // If not provided, text will inherit color from parent node
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn("flex items-baseline gap-1 text-muted-foreground animate-pulse", className)}>
        {label && <span className={cn(labelFontSize, textColor)}>{label}</span>}
        <span className={cn(valueFontSize, "font-semibold", textColor)}>. . .</span>
        {unit && <span className={cn(labelFontSize, textColor, "ml-0.5")}>{unit}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-baseline gap-1", className)} title={`${label || ''} ${value} ${unit || ''}`.trim()}>
      {label && <span className={cn(labelFontSize, textColor, "opacity-80")}>{label}</span>}
      <span className={cn(valueFontSize, "font-semibold", textColor)}>{String(value)}</span>
      {unit && <span className={cn(labelFontSize, textColor, "ml-0.5 opacity-80")}>{unit}</span>}
    </div>
  );
};

export default React.memo(EmbeddedValueDisplay);
