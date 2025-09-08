// src/components/DashboardData/HeaderWidget.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderWidgetProps {
    id: string;
    title: string;
    isEditMode: boolean;
    onRemoveWidget: (widgetId: string) => void;
    itemVariants?: any;
    customIndex?: number;
}

const HeaderWidget: React.FC<HeaderWidgetProps> = ({ id, title, isEditMode, onRemoveWidget, itemVariants, customIndex }) => {
    return (
        <motion.div
            className="relative bg-card p-3 sm:p-4 rounded-lg shadow-sm border-border flex items-center justify-between h-full"
            variants={itemVariants}
            custom={customIndex}
            layout
        >
            <h2 className="text-lg sm:text-xl font-semibold text-card-foreground truncate" title={title}>
                {title}
            </h2>
            {isEditMode && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveWidget(id)}
                    title="Remove header"
                >
                    <XCircle className="h-5 w-5" />
                </Button>
            )}
        </motion.div>
    );
};

export default HeaderWidget;