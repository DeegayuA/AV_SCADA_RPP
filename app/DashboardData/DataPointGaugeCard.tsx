// src/components/dashboard/DataPointGaugeCard.tsx
'use client';
import React from 'react';
import { motion } from 'framer-motion';
// import { Card } from '@/components/ui/card'; // No longer using Shadcn Card
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'; // Assuming these are permissible with their internal styling
import { DataPoint as DataPointConfig } from '@/config/dataPoints';
import { NodeData } from './dashboardInterfaces';
import { HelpCircle, Zap, Thermometer, Droplet, Percent } from 'lucide-react';
import { ValueStatusDisplay as WowCircularGauge } from './CircularGauge';

interface DataPointGaugeCardProps {
    point: DataPointConfig;
    nodeValue: NodeData[string];
    isDisabled: boolean;
    // currentHoverEffect is not used in this component directly anymore.
    // It's defined and used locally.
}

// Use CSS variables for color palette to support light/dark themes
const PALETTE = {
    primary: 'var(--color-primary)',
    cardForeground: 'var(--color-card-foreground)',
    mutedForeground: 'var(--color-muted-foreground)',
    cardBackground: 'var(--color-card-background)',
    borderColor: 'var(--color-border)',
};

const getIconForPoint = (point: DataPointConfig): React.ElementType => {
    if (point.icon && typeof point.icon !== 'string') return point.icon;
    if (point.unit === 'V' || point.unit === 'A' || point.unit === 'W') return Zap;
    if (point.unit === '°C' || point.unit === '°F') return Thermometer;
    if (point.unit === '%') return Percent;
    if (point.name?.toLowerCase().includes('humidity')) return Droplet;
    return HelpCircle;
};

const DataPointGaugeCard: React.FC<DataPointGaugeCardProps> = React.memo(
    ({ point, nodeValue, isDisabled }) => {
        const PointIcon = getIconForPoint(point);
        const value = typeof nodeValue === 'number' ? nodeValue : (nodeValue === null ? null : undefined);

        const cardHoverEffect = isDisabled ? undefined : { scale: 1.02, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } };

        const cardStyle: React.CSSProperties = {
            height: '100%',
            padding: '0.75rem', // p-3
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // shadow-md approximation
            border: `1px solid ${PALETTE.borderColor}`,
            backgroundColor: PALETTE.cardBackground,
            backdropFilter: 'blur(4px)', // backdrop-blur-sm
            minHeight: '190px', // Combined min-h-[180px] sm:min-h-[200px] - choose a middle ground or base
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? 'not-allowed' : 'default',
            borderRadius: '0.75rem', // rounded-xl
            transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out', // for potential future hover styling via JS if needed
            overflow: 'hidden', // Good practice for cards
        };

        // Hover styles are tricky without CSS :hover.
        // Framer Motion handles scale, but not shadow changes or other CSS properties on hover.
        // For a pure JS/inline-style solution for shadow, you'd need onMouseEnter/onMouseLeave handlers.

        const topSectionStyle: React.CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem', // gap-1
            textAlign: 'center',
            width: '100%',
        };

        const pointIconStyle: React.CSSProperties = {
            marginBottom: '0.25rem', // mb-1
            flexShrink: 0,
        };

        const pointNameStyle: React.CSSProperties = {
            fontSize: '0.75rem', // text-xs
            fontWeight: 500, // font-medium
            color: PALETTE.cardForeground, // text-card-foreground/80 (simplified)
            lineHeight: 1.25, // leading-tight
            paddingLeft: '0.25rem', // px-1
            paddingRight: '0.25rem', // px-1
            maxWidth: '130px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', // truncate
        };

        const minMaxStyle: React.CSSProperties = {
            fontSize: '10px', // text-[10px]
            color: PALETTE.mutedForeground, // text-muted-foreground/70 (simplified)
        };

        const gaugeSectionStyle: React.CSSProperties = {
            width: '100%',
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            position: 'relative',
        };

        const tooltipBaseTextStyle: React.CSSProperties = {
            fontSize: '0.75rem', // text-xs
            margin: 0, // Reset paragraph margin
        };
        
        const tooltipNameStyle: React.CSSProperties = {
            ...tooltipBaseTextStyle,
            fontWeight: 600, // font-semibold
            fontSize: '0.875rem', // text-sm
            marginBottom: '0.25rem', // mb-1
        };

        const tooltipMutedStyle: React.CSSProperties = {
            ...tooltipBaseTextStyle,
            color: PALETTE.mutedForeground, // text-muted-foreground
            marginTop: '0.5rem', // mt-2 for the block
        };
        const tooltipMutedInlineStyle: React.CSSProperties = { // For parts within the same <p>
             ...tooltipBaseTextStyle,
            color: PALETTE.mutedForeground,
        };


        return (
            <motion.div
                // className="col-span-1" // Layout control moved to parent
                whileHover={cardHoverEffect}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ width: '100%' }} // Assuming it should take full width of its grid cell
            >
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div style={cardStyle}> {/* Replaced Card with div */}
                                <div style={topSectionStyle}>
                                    <PointIcon
                                        style={pointIconStyle}
                                        width={20} // w-5
                                        height={20} // h-5
                                        color={PALETTE.primary} // text-primary
                                        strokeWidth={1.5}
                                    />
                                    <span style={pointNameStyle} title={point.name}>
                                        {point.name}
                                    </span>
                                    {(point.min !== undefined || point.max !== undefined) && (
                                        <div style={minMaxStyle}>
                                            ({point.min ?? '–'} to {point.max ?? '–'})
                                        </div>
                                    )}
                                </div>

                                <div style={gaugeSectionStyle}>
                                    <div style={{ position: 'relative', width: 110, height: 110 }}>
                                        <WowCircularGauge
                                            value={value}
                                            size={{ width: 110, height: 110 }}
                                            config={point}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent
                            side="bottom"
                            // className="max-w-[250px]" // Shadcn should handle this with its own styles
                            // If TooltipContent from Shadcn UI doesn't accept a style prop directly for max-width,
                            // and relies on className, then this particular style might be lost or need a different approach.
                            // However, most Shadcn components allow passing style.
                            style={{ maxWidth: '250px', zIndex: 100 }} // Add zIndex if needed for overlap
                        >
                             <p style={tooltipNameStyle}>{point.name}</p>
                             <p style={tooltipBaseTextStyle}>{point.description ?? 'No specific description available.'}</p>
                             <p style={tooltipMutedStyle}>
                                ID: {point.nodeId}
                                {point.dataType && <span style={tooltipMutedInlineStyle}> ({point.dataType})</span>}
                                {point.unit && <span style={tooltipMutedInlineStyle}>, Unit: {point.unit}</span>}
                             </p>
                             <p style={tooltipBaseTextStyle}> {/* Applied base for consistency, adjust if different */}
                                <span style={tooltipMutedStyle}>Range: {point.min ?? 'N/A'} - {point.max ?? 'N/A'}</span>
                             </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </motion.div>
        );
    }
);

DataPointGaugeCard.displayName = 'DataPointGaugeCard';
export default DataPointGaugeCard;