// src/components/DashboardData/DashboardGridLayout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { PlusCircle, Save, Edit3, Check, Rows, Columns } from 'lucide-react'; // Added Rows, Columns for layout options
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import HeaderWidget from './HeaderWidget';
import { DataPoint } from '@/config/dataPoints'; // For types
import { DashboardGridWidgetItem, DEFAULT_WIDGET_HEIGHT, DEFAULT_WIDGET_WIDTH, findNextAvailablePosition, GRID_COLS, GRID_ROW_HEIGHT } from './controlGridConfig';
import { NodeData } from '../DashboardData/dashboardInterfaces';
import DataPointCard from '../DashboardData/DataPointCard';
import ThreePhaseGroupCard from '../DashboardData/ThreePhaseGroupCard';

// Props that DataPointCard and ThreePhaseGroupCard expect
// (Ensure these are consistent with your actual card components)
interface CommonCardProps {
    nodeValues: NodeData;
    isDisabled: boolean;
    sendDataToWebSocket: (nodeId: string, value: any) => void;
    playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
    lastToastTimestamps: React.MutableRefObject<Record<string, number>>;
}

interface DashboardGridLayoutProps extends CommonCardProps {
    widgets: DashboardGridWidgetItem[];
    onWidgetsChange: (widgets: DashboardGridWidgetItem[]) => void;
    layouts: Layouts;
    onLayoutsChange: (layouts: Layouts) => void;
    isEditMode: boolean;
    // Add any other props your cards might need (e.g., currentHoverEffect from original DashboardSection)
}

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardGridLayout: React.FC<DashboardGridLayoutProps> = ({
    widgets,
    onWidgetsChange,
    layouts,
    onLayoutsChange,
    isEditMode,
    // Pass through common props
    nodeValues,
    isDisabled,
    sendDataToWebSocket,
    playNotificationSound,
    lastToastTimestamps,
}) => {
    const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
    const [headerTitle, setHeaderTitle] = useState('');
    const [isHeaderDialogOpen, setIsHeaderDialogOpen] = useState(false);

    const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
        // Only save if in edit mode to prevent overwriting during responsive adjustments
        if (isEditMode) {
             onLayoutsChange(allLayouts);
        }
    };

    const onBreakpointChange = (newBreakpoint: string) => {
        setCurrentBreakpoint(newBreakpoint);
    };
    
    const onRemoveWidget = useCallback((widgetIdToRemove: string, isGroup: boolean = false, groupKeyToRemove?: string) => {
        let updatedWidgets = widgets;
        if (isGroup && groupKeyToRemove) {
            // If it's a group, remove the group widget itself
            updatedWidgets = widgets.filter(w => w.id !== groupKeyToRemove);
        } else {
            // If it's an individual data point (or header)
            updatedWidgets = widgets.filter(w => w.id !== widgetIdToRemove);
        }
        
        const updatedLayouts: Layouts = {};
        Object.keys(layouts).forEach(bp => {
            updatedLayouts[bp] = layouts[bp].filter(l => l.i !== widgetIdToRemove && l.i !== groupKeyToRemove);
        });

        onWidgetsChange(updatedWidgets);
        onLayoutsChange(updatedLayouts);
    }, [widgets, layouts, onWidgetsChange, onLayoutsChange]);


    const addHeaderWidget = () => {
        if (!headerTitle.trim()) return;
        const newHeaderId = `header-${Date.now()}`;
        const newWidget: DashboardGridWidgetItem = {
            id: newHeaderId,
            content: { type: 'header', title: headerTitle },
        };

        const newLayoutItem: Layout = {
            i: newHeaderId,
            x: findNextAvailablePosition(
                layouts[currentBreakpoint] || [],
                DEFAULT_WIDGET_WIDTH,
                DEFAULT_WIDGET_HEIGHT.header,
                GRID_COLS[currentBreakpoint as keyof typeof GRID_COLS]
            ).x,
            y: findNextAvailablePosition(
                layouts[currentBreakpoint] || [],
                DEFAULT_WIDGET_WIDTH,
                DEFAULT_WIDGET_HEIGHT.header,
                GRID_COLS[currentBreakpoint as keyof typeof GRID_COLS]
            ).y,
            w: DEFAULT_WIDGET_WIDTH * 2, // Headers might be wider
            h: DEFAULT_WIDGET_HEIGHT.header,
            minW: 2,
            minH: DEFAULT_WIDGET_HEIGHT.header,
        };
        
        const updatedWidgets = [...widgets, newWidget];
        const updatedLayouts = { ...layouts };
        Object.keys(GRID_COLS).forEach(bp => {
            updatedLayouts[bp] = [...(updatedLayouts[bp] || []), { ...newLayoutItem, ...findNextAvailablePosition(updatedLayouts[bp] || [], newLayoutItem.w, newLayoutItem.h, GRID_COLS[bp as keyof typeof GRID_COLS]) }];
        });
        
        onWidgetsChange(updatedWidgets);
        onLayoutsChange(updatedLayouts);
        setHeaderTitle('');
        setIsHeaderDialogOpen(false);
    };


    const renderWidget = (widget: DashboardGridWidgetItem) => {
        const commonCardPropsToPass = {
            nodeValues,
            isDisabled,
            sendDataToWebSocket,
            playNotificationSound,
            lastToastTimestamps,
            isEditMode,
            // onRemoveItem will be specific to the card if it needs fine-grained removal
        };

        switch (widget.content.type) {
            case 'dataPoint':
                return (
                    <DataPointCard
                        currentHoverEffect={undefined} point={widget.content.data}
                        onRemoveItem={(id) => onRemoveWidget(id)} // DataPointCard's onRemoveItem expects just the ID
                        {...commonCardPropsToPass}                        // key={widget.id} // Key is handled by react-grid-layout div
                    />
                );
            case 'threePhaseGroup':
                return (
                    <ThreePhaseGroupCard
                        group={widget.content.data}
                        currentHoverEffect={undefined}
                        onRemoveItem={onRemoveWidget} 
                        {...commonCardPropsToPass}
                        // key={widget.id}
                    />
                );
            case 'header':
                return (
                    <HeaderWidget
                        id={widget.id}
                        title={widget.content.title}
                        isEditMode={isEditMode}
                        onRemoveWidget={onRemoveWidget}
                        // key={widget.id}
                    />
                );
            default:
                return <div className="p-2 border border-dashed border-red-400">Unknown widget type</div>;
        }
    };

    return (
        <div className="dashboard-grid-layout-container">
            {isEditMode && (
                 <div className="mb-4 p-3 bg-secondary/50 border border-dashed rounded-md flex items-center gap-2">
                    <Dialog open={isHeaderDialogOpen} onOpenChange={setIsHeaderDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Header
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Header</DialogTitle></DialogHeader>
                            <Input
                                placeholder="Header title (e.g., Critical Loads)"
                                value={headerTitle}
                                onChange={(e) => setHeaderTitle(e.target.value)}
                                className="my-3"
                            />
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsHeaderDialogOpen(false)}>Cancel</Button>
                                <Button onClick={addHeaderWidget} disabled={!headerTitle.trim()}>Add Header</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                     <span className="text-sm text-muted-foreground">You are in edit mode. Drag items to rearrange.</span>
                </div>
            )}
            <ResponsiveGridLayout
                layouts={layouts}
                onLayoutChange={handleLayoutChange}
                breakpoints={GRID_COLS} // {lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}
                cols={GRID_COLS} // {lg: 12, md: 10, sm: 6, xs: 4, xxs: 2}
                rowHeight={GRID_ROW_HEIGHT} // Adjust as needed
                draggableHandle=".drag-handle" // Optional: If you want specific drag handles
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onBreakpointChange={onBreakpointChange}
                containerPadding={[10, 10]}
                margin={[10, 10]}
                className={isEditMode ? "bg-muted/30 border border-dashed border-primary/50 rounded-md" : ""}
            >
                {widgets.map((widget) => (
                    <div key={widget.id} className={`widget-wrapper ${isEditMode ? 'border border-transparent hover:border-primary/70' : ''} rounded-lg overflow-hidden bg-card shadow-sm`}>
                       {/* 
                         If you add a drag handle, it would go here, e.g.
                         {isEditMode && <div className="drag-handle cursor-move bg-gray-200 p-1 text-center">Drag</div>} 
                       */}
                        {renderWidget(widget)}
                    </div>
                ))}
            </ResponsiveGridLayout>
            {widgets.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    Dashboard is empty. Click "Add Items" and then "Edit Layout" to add and arrange widgets.
                </div>
            )}
        </div>
    );
};

export default DashboardGridLayout;