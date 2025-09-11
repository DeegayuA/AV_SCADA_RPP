// app/control/control_dash.tsx
'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, Variants, TargetAndTransition } from 'framer-motion';
import { cn, playNotificationSound } from "@/lib/utils";
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Settings, Clock, Trash2, RotateCcw, AlertTriangle, Check,
  ShieldAlert, InfoIcon as InfoIconLucide, Loader2, Maximize2, X, Pencil, LayoutList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ensureAppConfigIsSaved, initDB, queueControlAction, getControlQueue, clearControlQueue } from '@/lib/db';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader as DialogHeaderComponentInternal,
  DialogTitle as DialogTitleComponentInternal,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { dataPoints as allPossibleDataPointsConfig, DataPoint } from '@/config/dataPoints';

// Extend DataPoint type to include missing properties
interface ExtendedDataPoint extends DataPoint {
  threePhaseGroup?: string;
  phase?: string;
  icon?: any; 
}
import { VERSION, PLANT_NAME, AVAILABLE_SLD_LAYOUT_IDS, LOCAL_STORAGE_KEY_PREFIX, WEBSOCKET_CUSTOM_URL_KEY as CUSTOM_WEBSOCKET_URL_KEY, OPC_UA_CUSTOM_ENDPOINT_URL_KEY } from '@/config/constants';
import { containerVariants, itemVariants as _itemVariants } from '@/config/animationVariants';
const itemVariants: Variants = _itemVariants as Variants;
import { playSuccessSound, playErrorSound, playWarningSound, playInfoSound } from '@/lib/utils';
import { NodeData, ThreePhaseGroupInfo } from '@/app/DashboardData/dashboardInterfaces';
import { groupDataPoints } from '@/app/DashboardData/groupDataPoints';
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator';
import PlcConnectionStatus from '@/app/DashboardData/PlcConnectionStatus';
import WebSocketStatus from '@/app/DashboardData/WebSocketStatus';
import SoundToggle from '@/app/DashboardData/SoundToggle';
import ThemeToggle from '@/app/DashboardData/ThemeToggle';
import DashboardSection from '@/app/DashboardData/DashboardSection';
import { UserRole } from '@/types/auth';
import SLDWidget from "@/app/circuit/sld/SLDWidget";
import { SLDLayout } from '@/types/sld';
import { useDynamicDefaultDataPointIds } from '@/app/utils/defaultDataPoints';
import PowerTimelineGraph, { TimeScale } from './PowerTimelineGraph';
import PowerTimelineGraphConfigurator from './PowerTimelineGraphConfigurator';
import { useAppStore, useCurrentUser, useWebSocketStatus } from '@/stores/appStore';
import { logActivity } from '@/lib/activityLog';
import WeatherCard, { WeatherCardConfig, loadWeatherCardConfigFromStorage } from './WeatherCard';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import ConfigurableDataPointTable from './ConfigurableDataPointTable';

interface DashboardHeaderControlProps {
  plcStatus: "online" | "offline" | "disconnected";
  isConnected: boolean;
  connectWebSocket: () => void;
  onClickWsStatus: () => void;
  onClickOpcuaStatus: () => void;
  currentTime: string;
  delay: number;
  version: string;
  onOpenConfigurator: () => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  currentUserRole?: UserRole;
  onRemoveAll: () => void;
  onResetToDefault: () => void;
  wsAddress?: string;
}

const DashboardHeaderControl: React.FC<DashboardHeaderControlProps> = React.memo(
  ({
    plcStatus, isConnected, connectWebSocket, onClickWsStatus, onClickOpcuaStatus, currentTime, delay,
    version, onOpenConfigurator, isEditMode, toggleEditMode, currentUserRole, onRemoveAll, onResetToDefault, wsAddress
  }) => {
    const router = useRouter();
    const currentPathname = usePathname();
    const headerTitle = currentPathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';
    const isAdmin = currentUserRole === UserRole.ADMIN;

    const navigateToResetPage = useCallback(() => {
      router.push('/reset');
    }, [router]);

    return (
      <>
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center mb-2 md:mb-4 gap-4 pt-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center sm:text-left">
            {PLANT_NAME} {headerTitle}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} onClick={onClickOpcuaStatus} /></motion.div>
            <motion.div variants={itemVariants}>
              <WebSocketStatus isConnected={isConnected} onClick={onClickWsStatus} wsAddress={wsAddress} />
            </motion.div>
            <motion.div variants={itemVariants}><SoundToggle /></motion.div>
            <motion.div variants={itemVariants}><ThemeToggle /></motion.div>
            {isAdmin && isEditMode && (
              <>
                <motion.div variants={itemVariants}>
                  <Button variant="default" size="sm" onClick={onOpenConfigurator} title="Add new cards to the dashboard">
                    <Pencil className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Edit Cards</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="destructive" size="sm" title="Remove all cards from dashboard">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Remove All</span>
                        <span className="md:hidden sr-only">Remove All Cards</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeaderComponent>
                      <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                      <AlertDialogDescription>
                        This action will remove all cards from your current dashboard layout. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeaderComponent>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemoveAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remove All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <Button variant="outline" size="sm" title="Reset dashboard to default layout">
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        <span className="hidden md:inline">Reset Layout</span>
                        <span className="md:hidden sr-only">Reset Layout</span>
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeaderComponent>
                      <AlertDialogTitleComponent>Reset to Default Layout?</AlertDialogTitleComponent>
                      <AlertDialogDescription>
                        This will discard your current layout and restore the default set of cards for this dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeaderComponent>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onResetToDefault}>Reset Dashboard</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {isAdmin && (
              <>
                <motion.div variants={itemVariants}>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant={isEditMode ? "secondary" : "ghost"} size="icon" onClick={toggleEditMode} title={isEditMode ? "Finalize Dashboard Edits" : "Enable Dashboard Layout Editing"}>
                          {isEditMode ? <Check className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                          <span className="sr-only">{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{isEditMode ? "Done Editing Layout" : "Edit Dashboard Layout"}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={itemVariants}>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40 dark:hover:bg-destructive/20 dark:text-destructive/90 dark:hover:text-destructive"
                              title="Access Application Reset Utility"
                            >
                              <ShieldAlert className="h-5 w-5" />
                              <span className="sr-only">Reset Application Data</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground">
                            <p>Access Application Reset Utility (Admin)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeaderComponent>
                      <AlertDialogTitleComponent className="flex items-center"><AlertTriangle className="text-destructive mr-2 h-6 w-6" />Confirm Navigation</AlertDialogTitleComponent>
                      <AlertDialogDescription>
                        You are about to navigate to the <strong>Application Data Management</strong> page. This section contains tools for critical operations like full application reset and data import/export.
                        <br /><br />
                        Proceed with caution. Ensure you understand the implications of actions performed on that page.
                      </AlertDialogDescription>
                    </AlertDialogHeaderComponent>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Stay on Dashboard</AlertDialogCancel>
                      <AlertDialogAction onClick={navigateToResetPage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Go to Reset Page
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="text-xs text-muted-foreground mb-4 flex flex-col sm:flex-row justify-between items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{currentTime}</span>
            {isConnected ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`font-mono cursor-default px-1.5 py-0.5 rounded text-xs ${delay < 3000 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50'
                      : delay < 10000 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50'
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`
                    }>
                      {delay > 30000 ? '>30s lag' : `${(delay / 1000).toFixed(1)}s lag`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p>Last data received {delay} ms ago</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="ghost" size="sm" className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground -ml-1" onClick={() => connectWebSocket()} title="Attempt manual WebSocket reconnection">
                (reconnect)
              </Button>
            )}
          </div>
          <span className='font-mono'>{version || '?.?.?'}</span>
        </motion.div>
      </>
    );
  });
// interface HeaderConnectivityComponentProps extends DashboardHeaderControlProps { }
// const HeaderConnectivityComponent: React.FC<HeaderConnectivityComponentProps> = (props) => {
//   return <DashboardHeaderControl {...props} />;
// };


interface SectionToRender { title: string; items: (DataPoint | ThreePhaseGroupInfo)[]; gridCols: string; }
interface RenderingComponentProps {
  sections: SectionToRender[]; isEditMode: boolean; nodeValues: NodeData; isConnected: boolean;
  currentHoverEffect: TargetAndTransition; sendDataToWebSocket: (nodeId: string, value: boolean | number | string) => void;
  playNotificationSound: (type: 'success' | 'error' | 'warning' | 'info') => void;
  lastToastTimestamps: React.MutableRefObject<Record<string, number>>; onRemoveItem: (dataPointIdToRemove: string) => void;
  allPossibleDataPoints: DataPoint[]; containerVariants: Variants; currentUserRole?: UserRole;
}
const RenderingComponent: React.FC<RenderingComponentProps> = ({ sections, isEditMode, nodeValues, isConnected, currentHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, onRemoveItem, allPossibleDataPoints, containerVariants, currentUserRole }) => (
  <motion.div className="space-y-8 py-4" variants={containerVariants} initial="hidden" animate="visible">
    {sections.length === 0 && !isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><InfoIconLucide className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Dashboard is Empty</h3><p>No data points configured for display in these sections.</p><p className="mt-2">{currentUserRole === UserRole.ADMIN ? 'Click the "Edit Layout" button in the header to add data points.' : 'Contact an administrator to configure the dashboard.'}</p></div>)}
    {sections.length === 0 && isEditMode && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"><Settings className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">Layout Editor Mode</h3><p>No data points currently selected for these sections.</p><p className="mt-2">Click the "Add Cards" button above to get started.</p></div>)}
    {sections.map((section) => (
      <DashboardSection
        key={section.title + ((section.items[0] as DataPoint)?.id || Math.random().toString())}
        title={section.title} gridCols={section.gridCols} items={section.items} nodeValues={nodeValues}
        isDisabled={!isConnected}
        currentHoverEffect={currentHoverEffect} sendDataToWebSocket={sendDataToWebSocket}
        playNotificationSound={playNotificationSound} lastToastTimestamps={lastToastTimestamps}
        isEditMode={isEditMode}
        onRemoveItem={onRemoveItem} allPossibleDataPoints={allPossibleDataPoints} currentUserRole={currentUserRole} />
    ))}
  </motion.div>
);


const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const DEFAULT_SLD_LAYOUT_ID_KEY = `userSldLayoutId_${PLANT_NAME.replace(/\s+/g, '_')}`;
const CUSTOM_DATA_POINTS_KEY = `${LOCAL_STORAGE_KEY_PREFIX}_customDataPoints_v1`;

const PAGE_SLUG = 'control_dashboard';
const GRAPH_CONFIG_KEY_PREFIX = `powerGraphConfig_${PLANT_NAME.replace(/\s+/g, '_')}_${PAGE_SLUG}`;
const GRAPH_GEN_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_generationDpIds`;
const GRAPH_USAGE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_usageDpIds`;
const GRAPH_EXPORT_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_exportDpIds`;
const GRAPH_EXPORT_MODE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_exportMode`;
const GRAPH_DEMO_MODE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_demoMode`;
const GRAPH_TIMESCALESETTING_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_timeScaleSetting`;
const GRAPH_WIND_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_windDpIds`;

const WEATHER_CARD_CONFIG_LS_KEY = `weatherCardConfig_${PLANT_NAME.replace(/\s+/g, '_') || 'defaultPlant'}`;


const DEFAULT_DISPLAY_COUNT = 6;
const CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD = 4;
const OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD = 4;

type NewDataPointData = Omit<DataPoint, 'id'> & { id?: string };

const UnifiedDashboardPage: React.FC = () => {
  const router = useRouter();
  const currentPath = usePathname();
  const { resolvedTheme } = useTheme();
  const currentUser = useCurrentUser();
  
  // Global state management
  const isGlobalEditMode = useAppStore(state => state.isEditMode);
  const toggleEditModeAction = useAppStore(state => state.toggleEditMode);
  const nodeValues = useAppStore(state => state.opcUaNodeValues);

  // WebSocket connection via dedicated hook
  const { sendJsonMessage, changeWebSocketUrl, connect: connectWebSocket, isConnected, activeUrl: webSocketUrl } = useWebSocket();

  const currentUserRole = currentUser?.role;

  // Local UI state
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [opcuaApiStatus, setOpcuaApiStatus] = useState<any>(null);
  const [opcuaConnectionStatus, setOpcuaConnectionStatus] = useState<any>(null);
  const [isStatusLoading, setIsStatusLoading] = useState<boolean>(false);
  const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [delay, setDelay] = useState<number>(0);
  const [isWsConfigModalOpen, setIsWsConfigModalOpen] = useState(false);
  const [tempWsUrl, setTempWsUrl] = useState<string>('');
  const [isOpcuaConfigModalOpen, setIsOpcuaConfigModalOpen] = useState(false);
  const [tempOpcuaUrl, setTempOpcuaUrl] = useState<string>('');
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [isSldModalOpen, setIsSldModalOpen] = useState(false);
  const [isModalSldLayoutConfigOpen, setIsModalSldLayoutConfigOpen] = useState(false);
  const [isSldConfigOpen, setIsSldConfigOpen] = useState(false);
  const [availableSldLayoutsForPage, setAvailableSldLayoutsForPage] = useState<{ id: string; name: string }[]>([]);
  const [sldLayoutId, setSldLayoutId] = useState<string>(AVAILABLE_SLD_LAYOUT_IDS[0] || 'main_plant');
  const [displayedDataPointIds, setDisplayedDataPointIds] = useState<string[]>([]);
  const [graphTimeScale, setGraphTimeScale] = useState<TimeScale>('1m');
  const [isGraphConfiguratorOpen, setIsGraphConfiguratorOpen] = useState(false);
  const [powerGraphGenerationDpIds, setPowerGraphGenerationDpIds] = useState<string[]>([]);
  const [powerGraphUsageDpIds, setPowerGraphUsageDpIds] = useState<string[]>([]);
  const [powerGraphExportDpIds, setPowerGraphExportDpIds] = useState<string[]>([]);
  const [allPossibleDataPoints, setAllPossibleDataPoints] = useState<ExtendedDataPoint[]>(allPossibleDataPointsConfig);
  const [powerGraphExportMode, setPowerGraphExportMode] = useState<'auto' | 'manual'>('auto');
  const [powerGraphWindDpIds, setPowerGraphWindDpIds] = useState<string[]>([]);
  const [useDemoDataForGraph, setUseDemoDataForGraph] = useState<boolean>(false);
  const [weatherCardConfig, setWeatherCardConfig] = useState<WeatherCardConfig | null>(null);

  const currentlyDisplayedDataPoints = useMemo(() => displayedDataPointIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as ExtendedDataPoint[], [displayedDataPointIds, allPossibleDataPoints]);
  const lastToastTimestamps = useRef<Record<string, number>>({});
  
  const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(currentlyDisplayedDataPoints), [currentlyDisplayedDataPoints]);
  const controlItems = useMemo(() => individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch' || p.uiType === 'input'), [individualPoints]);
  const statusDisplayItems = useMemo(() => individualPoints.filter(p => p.category === 'status' && p.uiType === 'display'), [individualPoints]);
  const gaugeItems = useMemo(() => individualPoints.filter(p => p.uiType === 'gauge'), [individualPoints]);
  const otherDisplayItems = useMemo(() => individualPoints.filter(p => p.uiType === 'display' && p.category !== 'status'), [individualPoints]);
  const topSections = useMemo<SectionToRender[]>(() => {
    const s: SectionToRender[] = []; const cGC = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'; const bC = controlItems.length > CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD; const bS = statusDisplayItems.length > CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD; if (bC || bS) { if (statusDisplayItems.length > 0) s.push({ title: "Status Readings", items: statusDisplayItems, gridCols: cGC }); if (controlItems.length > 0) s.push({ title: "Controls", items: controlItems, gridCols: cGC }); } else { const cI = [...statusDisplayItems, ...controlItems]; if (cI.length > 0) s.push({ title: "Controls & Status", items: cI, gridCols: cGC }); } return s;
  }, [controlItems, statusDisplayItems]);
  const gaugesOverviewSectionDefinition = useMemo<SectionToRender | null>(() => {
    if (gaugeItems.length > 0) return { title: "Gauges & Overview", items: gaugeItems, gridCols: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8' }; return null;
  }, [gaugeItems]);
  const bottomReadingsSections = useMemo<SectionToRender[]>(() => {
    if (otherDisplayItems.length === 0) return []; const cGC = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'; const s: SectionToRender[] = []; const dBC = otherDisplayItems.reduce((acc, p) => { const k = p.category || 'miscellaneous'; if (!acc[k]) acc[k] = []; acc[k].push(p); return acc; }, {} as Record<string, DataPoint[]>); const gORP: DataPoint[] = []; Object.entries(dBC).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, pts]) => { if (pts.length > OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD) s.push({ title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Readings`, items: pts, gridCols: cGC }); else gORP.push(...pts); }); if (gORP.length > 0) { const oRS: SectionToRender = { title: "Other Readings", items: gORP, gridCols: cGC }; if (s.some(sec => sec.title !== "Other Readings")) s.push(oRS); else s.unshift(oRS); } return s.filter(sec => sec.items.length > 0);
  }, [otherDisplayItems]);
  const cardHoverEffect = useMemo((): TargetAndTransition => (resolvedTheme === 'dark' ? { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.15), 0 5px 8px -5px rgba(0,0,0,0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } } : { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.08), 0 5px 8px -5px rgba(0,0,0,0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } }), [resolvedTheme]);
  const { threePhaseGroupsForConfig, individualPointsForConfig } = useMemo(() => {
    const g: Record<string, ConfiguratorThreePhaseGroup> = {}, i: DataPoint[] = []; const cS = new Set(displayedDataPointIds); allPossibleDataPoints.forEach(dp => { if (dp.threePhaseGroup && dp.phase && ['a', 'b', 'c', 'x', 'total'].includes(dp.phase)) { if (!g[dp.threePhaseGroup]) { let rN = dp.name.replace(/ (L[123]|Phase [ABCX]\b|Total\b)/ig, '').trim().replace(/ \([ABCX]\)$/i, '').trim(); g[dp.threePhaseGroup] = { name: dp.threePhaseGroup, representativeName: rN || dp.threePhaseGroup, ids: [], category: dp.category || 'miscellaneous' }; } g[dp.threePhaseGroup].ids.push(dp.id); } else if (!dp.threePhaseGroup) { i.push(dp); } }); const aGA = Array.from(new Set(Object.values(g).flatMap(grp => grp.ids))); const tIP = i.filter(ind => !aGA.includes(ind.id)); const cDA = Array.from(cS); return { threePhaseGroupsForConfig: Object.values(g).filter(grp => grp.ids.some(id => !cDA.includes(id))).sort((a, b) => a.representativeName.localeCompare(b.representativeName)), individualPointsForConfig: tIP.filter(dp => !cDA.includes(dp.id)).sort((a, b) => a.name.localeCompare(b.name)) };
  }, [allPossibleDataPoints, displayedDataPointIds]);
  const getHardcodedDefaultDataPointIds = useCallback(() => {
    const cIds = ['grid-total-active-power-side-to-side', 'inverter-output-total-power', 'load-total-power', 'battery-capacity', 'battery-output-power', 'input-power-pv1', 'active-power-adjust', 'pf-reactive-power-adjust', 'export-power-percentage'].filter(id => allPossibleDataPoints.some(dp => dp.id === id)); if (cIds.length > 0) return cIds; return allPossibleDataPoints.slice(0, DEFAULT_DISPLAY_COUNT).map(dp => dp.id);
  }, [allPossibleDataPoints]);
  const getSmartDefaults = useDynamicDefaultDataPointIds(allPossibleDataPoints);
  
  const processControlActionQueue = useCallback(async () => {
    if (!isConnected) { return; }
    const queuedActions = await getControlQueue();
    if (queuedActions.length === 0) return;
    console.log(`Processing ${queuedActions.length} queued control actions...`);
    toast.info("Processing Queued Actions", { description: `Found ${queuedActions.length} pending command(s).` });
    let allSentSuccessfully = true;
    for (const action of queuedActions) {
      try {
        sendJsonMessage({ type: 'controlWrite', payload: { [action.nodeId]: action.value } });
      } catch (e) {
        allSentSuccessfully = false;
        console.error(`Failed to send queued action for node ${action.nodeId}:`, e);
        toast.error("Queue Send Failed", { description: `Command for ${action.nodeId || '??'} failed.` });
      }
    }
    await clearControlQueue();
    if (allSentSuccessfully) toast.success("Queue Processed", { description: "All queued actions have been sent." });
    else toast.warning("Queue Processing Incomplete", { description: "Some actions could not be sent." });
  }, [isConnected, sendJsonMessage]);

  const sendDataToWebSocket = useCallback(async (nodeId: string, value: boolean | number | string) => {
    if (currentUserRole === UserRole.VIEWER) { toast.warning("Restricted Action", { description: "Viewers cannot send commands." }); playWarningSound(); return; }
    const pointConfig = allPossibleDataPoints.find(p => p.nodeId === nodeId); let processedValue: any = value; let queueValue: any = undefined;
    if (pointConfig?.dataType.includes('Int')) { let pN: number; if (typeof value === 'boolean') pN = value ? 1 : 0; else if (typeof value === 'string') pN = parseInt(value, 10); else pN = value as number; if (isNaN(pN)) { toast.error('Send Error', { description: 'Invalid integer value.' }); return; } processedValue = pN; queueValue = pN; }
    else if (pointConfig?.dataType === 'Boolean') { let pB: boolean; if (typeof value === 'number') pB = value !== 0; else if (typeof value === 'string') pB = value.toLowerCase() === 'true' || value === '1'; else pB = value as boolean; processedValue = pB; queueValue = pB; }
    else if (pointConfig?.dataType === 'Float' || pointConfig?.dataType === 'Double') { let pF: number; if (typeof value === 'string') pF = parseFloat(value); else pF = value as number; if (isNaN(pF)) { toast.error('Send Error', { description: 'Invalid numeric value.' }); return; } processedValue = pF; queueValue = pF; }
    if (typeof processedValue === 'number' && !isFinite(processedValue)) { toast.error('Send Error', { description: 'Numeric value is not finite (Infinity or NaN).' }); playErrorSound(); return; }
    
    logActivity('DATA_POINT_CHANGE', { nodeId: nodeId, newValue: processedValue, dataPointName: pointConfig?.name || 'Unknown DataPoint', dataType: pointConfig?.dataType || 'Unknown Type' }, currentPath);
    
    if (isConnected) {
      try {
        sendJsonMessage({ type: 'controlWrite', payload: { [pointConfig?.id || nodeId]: processedValue }});
        toast.info('Command Sent', { description: `${pointConfig?.name || nodeId} = ${String(processedValue)}` });
        playInfoSound();
      } catch (error) {
        console.error("WebSocket send error:", error);
        toast.error('Send Error', { description: 'Failed to send command. Queuing.' });
        playErrorSound();
        if (queueValue !== undefined) await queueControlAction(nodeId, queueValue);
        else toast.error('Queue Error', { description: `Cannot queue command for ${nodeId} due to undefined queue value.` });
      }
    } else {
      toast.warning('System Offline', { description: `Command for ${pointConfig?.name || nodeId} queued.` });
      playWarningSound();
      if (queueValue !== undefined) await queueControlAction(nodeId, queueValue);
      else toast.error('Queue Error', { description: `Cannot queue command for ${nodeId} due to undefined queue value.` });
    }
  }, [currentUserRole, allPossibleDataPoints, isConnected, sendJsonMessage, currentPath]);

  const checkPlcConnection = useCallback(async () => {
    if (!authCheckComplete) return; try { const r = await fetch('/api/opcua/status'); if (!r.ok) throw new Error(`API Err:${r.status}`); const d = await r.json(); const nS = d.connectionStatus; if (nS && ['online', 'offline', 'disconnected'].includes(nS)) setPlcStatus(nS); else { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); } } catch (e) { if (plcStatus !== 'disconnected') setPlcStatus('disconnected'); }
  }, [plcStatus, authCheckComplete]);
  const handleResetToDefault = useCallback(() => { if (currentUserRole !== UserRole.ADMIN) return; const smartDefaults = getSmartDefaults(); const defaultIds = smartDefaults.length > 0 ? smartDefaults : getHardcodedDefaultDataPointIds(); setDisplayedDataPointIds(defaultIds); toast.info("Layout reset to default."); logActivity('ADMIN_DASHBOARD_RESET_LAYOUT', { resetToIds: defaultIds }, currentPath); }, [getSmartDefaults, getHardcodedDefaultDataPointIds, currentUserRole, currentPath]);
  const handleRemoveAllItems = useCallback(() => { if (currentUserRole !== UserRole.ADMIN) return; const oldIds = displayedDataPointIds; setDisplayedDataPointIds([]); toast.info("All cards removed."); logActivity('ADMIN_DASHBOARD_REMOVE_ALL_CARDS', { removedAll: true, previousIds: oldIds }, currentPath); }, [currentUserRole, displayedDataPointIds, currentPath]);
  const handleAddMultipleDataPoints = useCallback((selectedIds: string[]) => {
    if (currentUserRole !== UserRole.ADMIN) return; const currentDisplayedSet = new Set(displayedDataPointIds); const newIdsToAdd = selectedIds.filter(id => !currentDisplayedSet.has(id));
    if (newIdsToAdd.length === 0 && selectedIds.length > 0) { toast.warning("Items already shown or none selected to add."); setIsConfiguratorOpen(false); return; }
    if (newIdsToAdd.length > 0) { const newFullList = Array.from(new Set([...displayedDataPointIds, ...newIdsToAdd])); setDisplayedDataPointIds(newFullList); toast.success(`${newIdsToAdd.length} new card${newIdsToAdd.length > 1 ? 's' : ''} added.`); logActivity('ADMIN_DASHBOARD_ADD_CARDS', { addedIds: newIdsToAdd, addedCount: newIdsToAdd.length, currentDashboardIds: newFullList }, currentPath); }
    setIsConfiguratorOpen(false);
  }, [displayedDataPointIds, currentUserRole, currentPath]);
  const handleSaveNewDataPoint = useCallback(async (data: any) => {
    if (currentUserRole !== UserRole.ADMIN) {
        toast.error("Permission Denied", { description: "You are not authorized to create new data points." });
        return { success: false, error: "Permission Denied." };
    }
    if (!data.name || !data.nodeId || !data.dataType || !data.uiType) {
        toast.error("Validation Failed", { description: "Missing required fields for the new data point." });
        return { success: false, error: "Missing required fields." };
    }

    const finalId = (data.id || data.name.toLowerCase().replace(/\s+/g, '-')).replace(/[^a-z0-9-]/g, '');
    if (!finalId) {
        toast.error("Validation Failed", { description: "Could not generate a valid ID from the provided name." });
        return { success: false, error: "Invalid ID." };
    }
    if (allPossibleDataPoints.some(p => p.id === finalId)) {
        toast.error("Conflict", { description: `A data point with the ID '${finalId}' already exists.` });
        return { success: false, error: `ID '${finalId}' already exists.` };
    }
    if (allPossibleDataPoints.some(p => p.nodeId === data.nodeId)) {
        toast.error("Conflict", { description: `A data point with the OPC UA Node ID '${data.nodeId}' already exists.` });
        return { success: false, error: `Node ID '${data.nodeId}' already exists.` };
    }

    const newPoint: DataPoint = {
      ...data,
      id: finalId,
      label: data.label || data.name,
      category: data.category || 'Custom',
      unit: data.unit || '',
      description: data.description || '',
      precision: data.precision ?? 2,
      min: data.min ?? 0,
      max: data.max ?? 100,
      threePhaseGroup: data.threePhaseGroup || undefined,
      phase: data.phase || undefined,
    };
    
    const storedCustomPoints = localStorage.getItem(CUSTOM_DATA_POINTS_KEY);
    const customPoints = storedCustomPoints ? JSON.parse(storedCustomPoints) : [];
    const updatedCustomPoints = [...customPoints, newPoint];
    localStorage.setItem(CUSTOM_DATA_POINTS_KEY, JSON.stringify(updatedCustomPoints));
    
    setAllPossibleDataPoints(prevPoints => [...prevPoints, newPoint].sort((a,b) => a.name.localeCompare(b.name)));
    setDisplayedDataPointIds(prevIds => [...prevIds, newPoint.id]);
    
    toast.success("Data Point Created", { description: `'${newPoint.name}' has been created and added to the dashboard.` });
    logActivity('ADMIN_DASHBOARD_CREATE_CARD', { newDataPoint: newPoint }, currentPath);
    
    return { success: true, newPoint: newPoint };
  }, [allPossibleDataPoints, currentUserRole, currentPath]);

  const handleRemoveItem = useCallback((dpIdToRemove: string) => {
    if (currentUserRole !== UserRole.ADMIN) return; const pointToRemove = allPossibleDataPoints.find(dp => dp.id === dpIdToRemove); let newDisplayedIds: string[]; if (pointToRemove?.threePhaseGroup) { const removedItemsList = allPossibleDataPoints.filter(dp => dp.threePhaseGroup === pointToRemove.threePhaseGroup).map(dp => dp.id); newDisplayedIds = displayedDataPointIds.filter(id => !removedItemsList.includes(id)); setDisplayedDataPointIds(newDisplayedIds); toast.info(`${pointToRemove.threePhaseGroup} group removed.`); logActivity('ADMIN_DASHBOARD_REMOVE_CARD', { removedGroupId: pointToRemove.threePhaseGroup, removedItemIds: removedItemsList, isGroup: true, currentDashboardIds: newDisplayedIds }, currentPath); } else { newDisplayedIds = displayedDataPointIds.filter(id => id !== dpIdToRemove); setDisplayedDataPointIds(newDisplayedIds); toast.info("Data point removed."); logActivity('ADMIN_DASHBOARD_REMOVE_CARD', { removedId: dpIdToRemove, isGroup: false, currentDashboardIds: newDisplayedIds }, currentPath); }
  }, [allPossibleDataPoints, currentUserRole, displayedDataPointIds, currentPath]);
  const handleSldLayoutSelect = useCallback((newLayoutId: string) => { const oldLayout = sldLayoutId; setSldLayoutId(newLayoutId); if (isSldConfigOpen) setIsSldConfigOpen(false); if (isModalSldLayoutConfigOpen) setIsModalSldLayoutConfigOpen(false); logActivity('ADMIN_SLD_LAYOUT_CHANGE', { oldLayoutId: oldLayout, newLayoutId: newLayoutId }, currentPath); }, [sldLayoutId, currentPath, isSldConfigOpen, isModalSldLayoutConfigOpen]);
  const fetchAndUpdatePageLayouts = useCallback(() => {
    if (typeof window !== 'undefined') {
      const layoutsFromStorage: { id: string; name: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const layoutIdKey = key.substring(LOCAL_STORAGE_KEY_PREFIX.length); let layoutName = layoutIdKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          try { const layoutJson = localStorage.getItem(key); if (layoutJson) { const parsedLayout = JSON.parse(layoutJson) as SLDLayout; if (parsedLayout.meta?.name) { layoutName = parsedLayout.meta.name; } } } catch (e) { console.warn(`ControlDash: Could not parse layout ${layoutIdKey} from localStorage for meta.name`, e); } layoutsFromStorage.push({ id: layoutIdKey, name: layoutName });
        }
      } const layoutIdsFromStorage = new Set(layoutsFromStorage.map(l => l.id));
      const layoutsFromConstants: { id: string; name: string }[] = AVAILABLE_SLD_LAYOUT_IDS.filter(id => !layoutIdsFromStorage.has(id)).map(id => ({ id, name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), }));
      const combinedLayouts = [...layoutsFromStorage, ...layoutsFromConstants]; combinedLayouts.sort((a, b) => a.name.localeCompare(b.name)); setAvailableSldLayoutsForPage(combinedLayouts);
    }
  }, []);
  
  const handleSaveWsUrl = useCallback(() => {
    changeWebSocketUrl(tempWsUrl);
    setIsWsConfigModalOpen(false);
    toast.success("WebSocket URL Updated", { description: `Now connecting to: ${tempWsUrl}` });
  }, [tempWsUrl, changeWebSocketUrl]);

  const handleTestOpcuaConnection = useCallback(async () => {
    if (!tempOpcuaUrl) {
      toast.error("Please enter an endpoint URL to test.");
      return;
    }
    toast.info("Testing OPC UA connection...", { id: 'opcua-test-toast' });
    try {
      const response = await fetch(`/api/opcua/status?testedClientSideEndpoint=${encodeURIComponent(tempOpcuaUrl)}`);
      const data = await response.json();
      if (data.connectionStatus !== 'disconnected') {
        toast.success("Connection Successful", { id: 'opcua-test-toast', description: data.message });
      } else {
        toast.error("Connection Failed", { id: 'opcua-test-toast', description: data.errorDetail || data.message });
      }
    } catch (error) {
      toast.error("Connection Test Failed", { id: 'opcua-test-toast', description: "An error occurred while testing the connection." });
    }
  }, [tempOpcuaUrl]);

  const handleSaveOpcuaConnection = useCallback(async () => {
    if (!tempOpcuaUrl) {
      toast.error("Please enter an endpoint URL to save.");
      return;
    }

    try {
      const response = await fetch('/api/opcua/set-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: tempOpcuaUrl }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(OPC_UA_CUSTOM_ENDPOINT_URL_KEY, tempOpcuaUrl);
        toast.success("Endpoint URL Saved", {
          description: "The new OPC UA endpoint URL has been saved and the server is reconnecting.",
          duration: 10000,
        });
        setIsOpcuaConfigModalOpen(false);
        // Manually trigger a status check after a short delay
        setTimeout(checkPlcConnection, 1000);
      } else {
        toast.error("Failed to Save Endpoint", { description: data.message });
      }
    } catch (error) {
      toast.error("Failed to Save Endpoint", { description: "An error occurred while saving the new endpoint URL." });
    }
  }, [tempOpcuaUrl, checkPlcConnection]);

    const handleOpenConfigurator = useCallback(() => {
    setIsConfiguratorOpen(true);
  }, []);

  const handleWsStatusClick = useCallback(() => {
    setTempWsUrl(webSocketUrl || '');
    setIsWsConfigModalOpen(true);
  }, [webSocketUrl]);

  const handleOpcuaConfigClick = useCallback(() => {
    const storedUrl = localStorage.getItem('custom_opcua_endpoint_url');
    setTempOpcuaUrl(storedUrl || '');
    setIsOpcuaConfigModalOpen(true);
  }, []);

  const handleOpcuaConfigClick = useCallback(() => {
    // Here you would also pre-fill with the current custom URL if it exists
    setIsOpcuaConfigModalOpen(true);
  }, []);

  const handleWeatherConfigChange = useCallback((newConfig: WeatherCardConfig) => { setWeatherCardConfig(newConfig); if (typeof window !== 'undefined') { localStorage.setItem(WEATHER_CARD_CONFIG_LS_KEY, JSON.stringify(newConfig)); } logActivity('WEATHER_CARD_CONFIG_CHANGE', { newConfig }, currentPath); }, [currentPath]);
  const handleSldWidgetLayoutChange = useCallback((newLayoutId: string) => { setSldLayoutId(newLayoutId); logActivity('SLD_LAYOUT_CHANGE', { newLayoutId }, currentPath); }, [setSldLayoutId, currentPath]);

  useEffect(() => { initDB().catch(console.error); ensureAppConfigIsSaved(); }, []);
  useEffect(() => { const storeHasHydrated = useAppStore.persist.hasHydrated(); if (!storeHasHydrated) return; if (!currentUser?.email || currentUser.email === 'guest@example.com') { toast.error("Auth Required", { description: "Please log in." }); router.replace('/login'); } else { setAuthCheckComplete(true); } }, [currentUser, router, currentPath]);
  
  useEffect(() => {
    if (authCheckComplete && typeof window !== 'undefined') {
        const storedCustomPoints = localStorage.getItem(CUSTOM_DATA_POINTS_KEY);
        let customPoints: DataPoint[] = [];
        if (storedCustomPoints) {
            try {
                const parsed = JSON.parse(storedCustomPoints);
                if (Array.isArray(parsed)) customPoints = parsed;
            } catch (e) {
                console.error("Failed to parse custom data points:", e);
            }
        }
        if (customPoints.length > 0) {
            const combined = [...allPossibleDataPointsConfig, ...customPoints];
            const uniqueMap = new Map<string, DataPoint>();
            combined.forEach(p => { if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p); });
            setAllPossibleDataPoints(Array.from(uniqueMap.values()).sort((a,b) => a.name.localeCompare(b.name)));
        }
    }
  }, [authCheckComplete]);
  
  useEffect(() => {
    if (isConnected) {
      processControlActionQueue();
    }
  }, [isConnected, processControlActionQueue]);
  
  useEffect(() => {
    if (Object.keys(nodeValues).length > 0) {
      setLastUpdateTime(Date.now());
    }
  }, [nodeValues]);

  useEffect(() => { fetchAndUpdatePageLayouts(); const handleStorageChange = (event: StorageEvent) => { if (event.key && event.key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) { fetchAndUpdatePageLayouts(); } else if (event.key === null) { fetchAndUpdatePageLayouts(); } }; window.addEventListener('storage', handleStorageChange); return () => { window.removeEventListener('storage', handleStorageChange); }; }, [fetchAndUpdatePageLayouts]);
  useEffect(() => { if (availableSldLayoutsForPage.length > 0 && authCheckComplete) { const currentStoredId = localStorage.getItem(DEFAULT_SLD_LAYOUT_ID_KEY); if (currentStoredId && availableSldLayoutsForPage.some(l => l.id === currentStoredId)) { if (sldLayoutId !== currentStoredId) setSldLayoutId(currentStoredId); } else if (availableSldLayoutsForPage.some(l => l.id === (AVAILABLE_SLD_LAYOUT_IDS[0] || 'main_plant'))) { const defaultId = AVAILABLE_SLD_LAYOUT_IDS[0] || 'main_plant'; if (sldLayoutId !== defaultId) setSldLayoutId(defaultId); localStorage.setItem(DEFAULT_SLD_LAYOUT_ID_KEY, defaultId); } else { const firstAvailableId = availableSldLayoutsForPage[0].id; if (sldLayoutId !== firstAvailableId) setSldLayoutId(firstAvailableId); localStorage.setItem(DEFAULT_SLD_LAYOUT_ID_KEY, firstAvailableId); } } }, [availableSldLayoutsForPage, authCheckComplete, sldLayoutId]);
  useEffect(() => { if (typeof window !== 'undefined' && authCheckComplete) localStorage.setItem(DEFAULT_SLD_LAYOUT_ID_KEY, sldLayoutId); }, [sldLayoutId, authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined' && allPossibleDataPoints.length > 0 && authCheckComplete) { const s = localStorage.getItem(USER_DASHBOARD_CONFIG_KEY); if (s) { try { const p = JSON.parse(s) as string[]; const v = p.filter(id => allPossibleDataPoints.some(dp => dp.id === id)); if (v.length > 0) { setDisplayedDataPointIds(v); return; } else if (p.length > 0) localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY); } catch (e) { console.error("Parse err", e); localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY); } } const sm = getSmartDefaults(); setDisplayedDataPointIds(sm.length > 0 ? sm : getHardcodedDefaultDataPointIds()); } }, [allPossibleDataPoints, getSmartDefaults, getHardcodedDefaultDataPointIds, authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined' && authCheckComplete) { if (displayedDataPointIds.length > 0) localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify(displayedDataPointIds)); else if (localStorage.getItem(USER_DASHBOARD_CONFIG_KEY)) localStorage.setItem(USER_DASHBOARD_CONFIG_KEY, JSON.stringify([])); } }, [displayedDataPointIds, authCheckComplete]);
  useEffect(() => { const uc = () => setCurrentTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: 'short', year: 'numeric' })); uc(); const i = setInterval(uc, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!authCheckComplete) return; const lagI = setInterval(() => { const cD = Date.now() - lastUpdateTime; setDelay(cD); const fS = typeof window !== 'undefined' && ['reloadingDueToDelay', 'redirectingDueToExtremeDelay', 'opcuaRedirected'].some(f => sessionStorage.getItem(f)); if (fS) return; if (isConnected && cD > 60000) { console.error(`CRIT WS lag(${(Number(cD) / 1000).toFixed(1)}s).`); toast.error('Critical Lag', { id: 'ws-lag', description: 'Re-establishing...', duration: 10000 }); connectWebSocket(); } else if (isConnected && cD > 30000) { console.warn(`High WS lag(${(Number(cD) / 1000).toFixed(1)}s).`); toast.warning('Stale Warn', { id: 'ws-stale', description: `Last upd >${(Number(cD) / 1000).toFixed(0)}s ago.`, duration: 8000 }); } }, 15000); return () => clearInterval(lagI); }, [lastUpdateTime, isConnected, authCheckComplete, connectWebSocket]);
  useEffect(() => { if (!authCheckComplete) return () => { }; checkPlcConnection(); const plcI = setInterval(checkPlcConnection, 15000); return () => clearInterval(plcI); }, [checkPlcConnection, authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined' && authCheckComplete) { setPowerGraphGenerationDpIds(JSON.parse(localStorage.getItem(GRAPH_GEN_KEY) || '["inverter-output-total-power"]')); setPowerGraphUsageDpIds(JSON.parse(localStorage.getItem(GRAPH_USAGE_KEY) || '["grid-total-active-power-side-to-side"]')); setPowerGraphExportDpIds(JSON.parse(localStorage.getItem(GRAPH_EXPORT_KEY) || '[]')); setPowerGraphWindDpIds(JSON.parse(localStorage.getItem(GRAPH_WIND_KEY) || '[]')); setPowerGraphExportMode((localStorage.getItem(GRAPH_EXPORT_MODE_KEY) as ('auto' | 'manual')) || 'auto'); setUseDemoDataForGraph(localStorage.getItem(GRAPH_DEMO_MODE_KEY) === 'true'); setGraphTimeScale((localStorage.getItem(GRAPH_TIMESCALESETTING_KEY) as TimeScale) || '1m'); } }, [authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined' && authCheckComplete) { localStorage.setItem(GRAPH_GEN_KEY, JSON.stringify(powerGraphGenerationDpIds)); localStorage.setItem(GRAPH_USAGE_KEY, JSON.stringify(powerGraphUsageDpIds)); localStorage.setItem(GRAPH_EXPORT_KEY, JSON.stringify(powerGraphExportDpIds)); localStorage.setItem(GRAPH_WIND_KEY, JSON.stringify(powerGraphWindDpIds)); localStorage.setItem(GRAPH_EXPORT_MODE_KEY, powerGraphExportMode); localStorage.setItem(GRAPH_DEMO_MODE_KEY, String(useDemoDataForGraph)); localStorage.setItem(GRAPH_TIMESCALESETTING_KEY, graphTimeScale); } }, [powerGraphGenerationDpIds, powerGraphUsageDpIds, powerGraphExportDpIds, powerGraphWindDpIds, powerGraphExportMode, useDemoDataForGraph, graphTimeScale, authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined' && authCheckComplete) { const loadedConfig = loadWeatherCardConfigFromStorage(); setWeatherCardConfig(loadedConfig); } }, [authCheckComplete]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (isWsConfigModalOpen) {
        setIsStatusLoading(true);
        try {
          const [apiRes, statusRes] = await Promise.all([
            fetch('/api/opcua'),
            fetch('/api/opcua/status')
          ]);

          if (!apiRes.ok || !statusRes.ok) {
            throw new Error('One or more API requests failed');
          }

          const apiData = await apiRes.json();
          const statusData = await statusRes.json();

          setOpcuaApiStatus(apiData);
          setOpcuaConnectionStatus(statusData);

        } catch (error) {
          console.error("Failed to fetch OPC-UA status:", error);
          toast.error("Failed to fetch status", { description: "Could not retrieve connection details from the server." });
          setOpcuaApiStatus(null);
          setOpcuaConnectionStatus(null);
        } finally {
          setIsStatusLoading(false);
        }
      }
    };

    fetchStatus();
  }, [isWsConfigModalOpen]);

  const storeHasHydrated = useAppStore.persist.hasHydrated();
  if (!storeHasHydrated || !authCheckComplete || weatherCardConfig === null) {
    return (<div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-lg">Loading Control Panel...</p></div>);
  }

  const sldSpecificEditMode = isGlobalEditMode && currentUserRole === UserRole.ADMIN;
  const sldSectionMinHeight = "min-h-[350px] sm:min-h-[400px]";
  const sldInternalMaxHeight = `calc(60vh - 3.5rem)`;
  const commonRenderingProps = { isEditMode: isGlobalEditMode, nodeValues, isConnected, currentHoverEffect: cardHoverEffect, sendDataToWebSocket, playNotificationSound, lastToastTimestamps, onRemoveItem: handleRemoveItem, allPossibleDataPoints, containerVariants, currentUserRole, };
  const hasAnyDynamicCardContent = topSections.length > 0 || !!gaugesOverviewSectionDefinition || bottomReadingsSections.length > 0;

  return (
    <div className="bg-background text-foreground px-2 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300 pb-8">
      <div className="max-w-screen-4xl mx-auto">
        <DashboardHeaderControl
          plcStatus={plcStatus} isConnected={isConnected} connectWebSocket={connectWebSocket}
          onClickWsStatus={handleWsStatusClick}
          currentTime={currentTime} delay={delay} version={VERSION}
          isEditMode={isGlobalEditMode} toggleEditMode={toggleEditModeAction}
          currentUserRole={currentUserRole} onOpenConfigurator={handleOpenConfigurator}
          onRemoveAll={handleRemoveAllItems} onResetToDefault={handleResetToDefault} wsAddress={webSocketUrl} />

        {topSections.length > 0 && (<RenderingComponent sections={topSections} {...commonRenderingProps} />)}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 xl:gap-4 my-4 md:my-6">
          <Card className={cn(
            threePhaseGroups.length > 0 ? "lg:col-span-4" : "lg:col-span-5",
            "shadow-lg transition-all duration-300", sldSectionMinHeight
          )}>
            <CardContent className="p-3 sm:p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold">Plant Layout</h3>
                  {sldSpecificEditMode && (
                    <Dialog open={isSldConfigOpen} onOpenChange={setIsSldConfigOpen}>
                      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 px-2 text-xs"><LayoutList className="h-3.5 w-3.5 mr-1.5" />Configure Layout: {(availableSldLayoutsForPage.find(l => l.id === sldLayoutId)?.name || sldLayoutId).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]"><DialogHeaderComponentInternal><DialogTitleComponentInternal>Select SLD Layout</DialogTitleComponentInternal></DialogHeaderComponentInternal>
                        <div className="py-4"><Select onValueChange={handleSldLayoutSelect} value={sldLayoutId}><SelectTrigger className="w-full mb-2"><SelectValue placeholder="Choose..." /></SelectTrigger><SelectContent>{availableSldLayoutsForPage.map(layout => <SelectItem key={layout.id} value={layout.id}>{layout.name}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground mt-2">Select SLD. Changes client-side until saved in editor.</p></div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {!sldSpecificEditMode && sldLayoutId && <span className="text-lg font-semibold text-muted-foreground ml-1"> : {(availableSldLayoutsForPage.find(l => l.id === sldLayoutId)?.name || sldLayoutId).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>}
                </div>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsSldModalOpen(true)} title="Open SLD"><Maximize2 className="h-5 w-5" /><span className="sr-only">Open SLD</span></Button></TooltipTrigger><TooltipContent><p>Open SLD in larger view</p></TooltipContent></Tooltip></TooltipProvider>
              </div>
              <div style={{ height: sldInternalMaxHeight }} className="overflow-hidden rounded-md border flex-grow bg-muted/20 dark:bg-muted/10">
                <SLDWidget layoutId={sldLayoutId} isEditMode={sldSpecificEditMode} onLayoutIdChange={handleSldWidgetLayoutChange} />
              </div>
            </CardContent>
          </Card>

          {threePhaseGroups.length > 0 && (
            <Card className={cn("shadow-lg", sldSectionMinHeight)}>
              <CardContent className="p-3 sm:p-4 h-full flex flex-col">
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Three-Phase Elements</h3>
                <div className="overflow-y-auto flex-grow" style={{ maxHeight: sldInternalMaxHeight }}>
                  <DashboardSection title="" gridCols="grid-cols-1 gap-y-3" items={threePhaseGroups} isDisabled={!isConnected} {...commonRenderingProps} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-2 xl:gap-4 my-4 md:my-6">
          {weatherCardConfig && (
            <Card className="w-auto flex-shrink-0 shadow-xl border-2 border-primary/20 dark:border-primary/30 h-full flex flex-col">
              <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
                <CardTitle className="text-xl sm:text-2xl">Weather Data</CardTitle>
              </CardHeader>
              <CardContent className="px-2 py-3 sm:px-3 flex-grow">
                <div className="h-full">
                  <WeatherCard initialConfig={weatherCardConfig} opcUaData={nodeValues} allPossibleDataPoints={allPossibleDataPoints} onConfigChange={handleWeatherConfigChange} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1 shadow-xl border-2 border-primary/20 dark:border-primary/30 h-full flex flex-col">
            <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl sm:text-2xl">Energy Timeline</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end sm:justify-start flex-wrap">
                  {isGlobalEditMode && currentUserRole === UserRole.ADMIN && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsGraphConfiguratorOpen(true)}><Settings className="h-4 w-4" /><span className="sr-only">Config Graph</span></Button></TooltipTrigger>
                        <TooltipContent><p>Configure Graph Data</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['30s', '1m', '5m', '30m', '1h', '6h', '12h', '1d', '7d', '1mo'] as TimeScale[]).map((ts) => (
                      <Button key={ts} variant={graphTimeScale === ts ? "default" : "outline"} size="sm" onClick={() => setGraphTimeScale(ts)} className="text-xs px-2 py-1 h-auto">{ts.toUpperCase()}</Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-3 sm:px-3 flex-grow">
              <div className="h-full">
                {(useDemoDataForGraph || (powerGraphGenerationDpIds && powerGraphGenerationDpIds.length > 0) || (powerGraphUsageDpIds && powerGraphUsageDpIds.length > 0)) ? (
                  <PowerTimelineGraph nodeValues={nodeValues} allPossibleDataPoints={allPossibleDataPoints} generationDpIds={powerGraphGenerationDpIds} usageDpIds={powerGraphUsageDpIds} exportDpIds={powerGraphExportDpIds} exportMode={powerGraphExportMode} timeScale={graphTimeScale} windDpIds={powerGraphWindDpIds} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground"><p>Graph data points not configured.{isGlobalEditMode && currentUserRole === UserRole.ADMIN && " Click settings."}</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="my-4 md:my-6">
            <ConfigurableDataPointTable allPossibleDataPoints={allPossibleDataPoints} nodeValues={nodeValues} />
        </div>
      </div>

      {gaugesOverviewSectionDefinition && (<RenderingComponent sections={[gaugesOverviewSectionDefinition]} {...commonRenderingProps} />)}

      {bottomReadingsSections.length > 0 && (<RenderingComponent sections={bottomReadingsSections} {...commonRenderingProps} />)}

      <Dialog open={isSldModalOpen} onOpenChange={setIsSldModalOpen}>
        <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] p-0 flex flex-col dark:bg-background bg-background border dark:border-slate-800">
          <DialogHeaderComponentInternal className="p-4 border-b dark:border-slate-700 flex flex-row justify-between items-center sticky top-0 bg-inherit z-10">
            <div className="flex items-center gap-2">
              <DialogTitleComponentInternal>Plant Layout{!sldSpecificEditMode && sldLayoutId && ` : ${(availableSldLayoutsForPage.find(l => l.id === sldLayoutId)?.name || sldLayoutId).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}</DialogTitleComponentInternal>
              {sldSpecificEditMode && (
                <Dialog open={isModalSldLayoutConfigOpen} onOpenChange={setIsModalSldLayoutConfigOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      <LayoutList className="h-3.5 w-3.5 mr-1.5" />
                      Layout: {(availableSldLayoutsForPage.find(l => l.id === sldLayoutId)?.name || sldLayoutId).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeaderComponentInternal>
                      <DialogTitleComponentInternal>Select SLD Layout</DialogTitleComponentInternal>
                    </DialogHeaderComponentInternal>
                    <div className="py-4">
                      <Select onValueChange={(v) => { setSldLayoutId(v); setIsModalSldLayoutConfigOpen(false); }} value={sldLayoutId}>
                        <SelectTrigger className="w-full mb-2">
                          <SelectValue placeholder="Choose..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSldLayoutsForPage.map((layout) => (
                            <SelectItem key={layout.id} value={layout.id}>
                              {layout.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-2">Select SLD. Changes client-side until saved in editor.</p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeaderComponentInternal>
          <div className="flex-grow p-2 sm:p-4 overflow-hidden">
            <SLDWidget layoutId={sldLayoutId} isEditMode={sldSpecificEditMode} onLayoutIdChange={handleSldWidgetLayoutChange} />
          </div>
        </DialogContent>
      </Dialog>

      <PowerTimelineGraphConfigurator
        isOpen={isGraphConfiguratorOpen}
        onClose={() => setIsGraphConfiguratorOpen(false)}
        allPossibleDataPoints={allPossibleDataPoints}
        currentGenerationDpIds={powerGraphGenerationDpIds}
        currentUsageDpIds={powerGraphUsageDpIds}
        currentExportDpIds={powerGraphExportDpIds}
        currentWindDpIds={powerGraphWindDpIds}
        initialExportMode={powerGraphExportMode}
        onSaveConfiguration={(config) => {
          setPowerGraphGenerationDpIds(config.generationDpIds);
          setPowerGraphUsageDpIds(config.usageDpIds);
          setPowerGraphExportDpIds(config.exportDpIds);
          setPowerGraphWindDpIds(config.windDpIds);
          setPowerGraphExportMode(config.exportMode);
          setIsGraphConfiguratorOpen(false);
        }}
      />

      <DashboardItemConfigurator
        isOpen={isConfiguratorOpen}
        onClose={() => setIsConfiguratorOpen(false)}
        availableIndividualPoints={individualPointsForConfig}
        availableThreePhaseGroups={threePhaseGroupsForConfig}
        currentDisplayedIds={displayedDataPointIds}
        onAddMultipleDataPoints={handleAddMultipleDataPoints}
        onSaveNewDataPoint={handleSaveNewDataPoint}
        itemTypeName="Dashboard Card"
      />

      <Dialog open={isOpcuaConfigModalOpen} onOpenChange={setIsOpcuaConfigModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeaderComponentInternal>
            <DialogTitleComponentInternal>OPC UA Connection</DialogTitleComponentInternal>
            <DialogDescription>
              Configure the OPC UA server endpoint URL.
            </DialogDescription>
          </DialogHeaderComponentInternal>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 pt-2">
              <label htmlFor="opcuaUrl" className="text-sm font-medium">
                Endpoint URL
              </label>
              <Input
                id="opcuaUrl"
                value={tempOpcuaUrl}
                onChange={(e) => setTempOpcuaUrl(e.target.value)}
                placeholder="opc.tcp://localhost:4840"
                aria-label="OPC UA Endpoint URL Input"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Enter the full OPC UA endpoint URL of your server.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpcuaConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestOpcuaConnection}>Test Connection</Button>
            <Button onClick={handleSaveOpcuaConnection}>Save & Reconnect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWsConfigModalOpen} onOpenChange={setIsWsConfigModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeaderComponentInternal>
            <DialogTitleComponentInternal>Connection Status & Configuration</DialogTitleComponentInternal>
            <DialogDescription>
              View live status information and manually override the WebSocket URL if needed.
            </DialogDescription>
          </DialogHeaderComponentInternal>
          <div className="grid gap-4 py-4">
            <div className="p-4 border rounded-lg bg-muted/50 max-h-[250px] overflow-y-auto">
              <h4 className="font-semibold mb-2 text-sm">Live Status</h4>
              {isStatusLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Loading connection details...</span>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {opcuaApiStatus ? (
                    <div className="p-2 border-l-2 pl-3 rounded-r-md bg-background">
                      <p><strong>Service Status:</strong> <span className={cn(opcuaApiStatus.status?.includes("Connected") ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400")}>{opcuaApiStatus.status || 'N/A'}</span></p>
                      <p className="text-muted-foreground">{opcuaApiStatus.message || 'No message.'}</p>
                    </div>
                  ) : <p>Could not load API service status.</p>}

                  {opcuaConnectionStatus ? (
                    <div className="p-2 border-l-2 pl-3 rounded-r-md bg-background">
                      <p>
                        <strong>OPC-UA Client: </strong>
                        <span
                          className={cn(
                            opcuaConnectionStatus.connectionStatus === "online"
                              ? "text-green-600 dark:text-green-400"
                              : opcuaConnectionStatus.connectionStatus === "offline"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {opcuaConnectionStatus.connectionStatus === "online"
                            ? "Connected Remotely"
                            : opcuaConnectionStatus.connectionStatus === "offline"
                            ? "Connected Locally"
                            : opcuaConnectionStatus.connectionStatus || "N/A"}
                        </span>
                      </p>
                       {opcuaConnectionStatus.testedEndpoint && <p><strong>Target Endpoint:</strong> <code className="text-muted-foreground">{opcuaConnectionStatus.testedEndpoint}</code></p>}
                       {opcuaConnectionStatus.errorDetail && opcuaConnectionStatus.errorDetail.trim() !== '' && <p><strong>Details:</strong> <span className="text-destructive">{opcuaConnectionStatus.errorDetail}</span></p>}
                       {!opcuaConnectionStatus.errorDetail && opcuaConnectionStatus.message && <p className="text-muted-foreground">{opcuaConnectionStatus.message}</p>}
                    </div>
                  ) : <p>Could not load OPC-UA connection details.</p>}
                </div>
              )}
            </div>
            <div className="grid gap-2 pt-2">
              <label htmlFor="wsUrl" className="text-sm font-medium">
                WebSocket URL Override
              </label>
              <Input
                id="wsUrl"
                value={tempWsUrl}
                onChange={(e) => setTempWsUrl(e.target.value)}
                placeholder="ws://localhost:2001"
                aria-label="WebSocket URL Input"
              />
               <p className="text-xs text-muted-foreground pt-1">
                The WebSocket URL is usually detected automatically. Only change this if you need to connect to a different server.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWsConfigModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveWsUrl}>Save & Reconnect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedDashboardPage;