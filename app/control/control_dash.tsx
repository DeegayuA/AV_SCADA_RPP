// app/control/page.tsx (or control_dash.tsx)
'use client';
import React, { useEffect, useState, useCallback, useRef, useMemo, Dispatch, SetStateAction } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, Variants, TargetAndTransition } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Orbit } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { 
    Settings, PlusCircle, Clock, Trash2, RotateCcw, Power, AlertTriangle, Check, 
    ShieldAlert, InfoIcon as InfoIconLucide, Loader2, Maximize2, X, Pencil, LayoutList 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ensureAppConfigIsSaved, initDB, updateDataPoint, queueControlAction, getControlQueue, clearControlQueue } from '@/lib/db'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeaderComponent, // Alias to avoid name clash
  AlertDialogTitle as AlertDialogTitleComponent, // Alias
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader as DialogHeaderComponentInternal, // Alias
  DialogTitle as DialogTitleComponentInternal, // Alias
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"; 
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"; 
import { dataPoints as allPossibleDataPointsConfig, DataPoint } from '@/config/dataPoints';
import { WS_URL, VERSION, PLANT_NAME, AVAILABLE_SLD_LAYOUT_IDS } from '@/config/constants';
import { containerVariants, itemVariants } from '@/config/animationVariants';
import { playSound } from '@/lib/utils';
import { NodeData, ThreePhaseGroupInfo } from '@/app/DashboardData/dashboardInterfaces'; // ADJUST PATH
import { groupDataPoints } from '@/app/DashboardData/groupDataPoints'; // ADJUST PATH
import DashboardItemConfigurator, { ConfiguratorThreePhaseGroup } from '@/components/DashboardItemConfigurator'; // ADJUST PATH
import PlcConnectionStatus from '@/app/DashboardData/PlcConnectionStatus'; // ADJUST PATH
import WebSocketStatus from '@/app/DashboardData/WebSocketStatus'; // ADJUST PATH
import SoundToggle from '@/app/DashboardData/SoundToggle'; // ADJUST PATH
import ThemeToggle from '@/app/DashboardData/ThemeToggle'; // ADJUST PATH
import DashboardSection from '@/app/DashboardData/DashboardSection'; // ADJUST PATH
import { UserRole } from '@/types/auth'; // ADJUST PATH
import SLDWidget from "@/app/circuit/sld/SLDWidget"; // ADJUST PATH
import { useDynamicDefaultDataPointIds } from '@/app/utils/defaultDataPoints'; // ADJUST PATH
import PowerTimelineGraph, { TimeScale } from './PowerTimelineGraph'; 
import PowerTimelineGraphConfigurator from './PowerTimelineGraphConfigurator';
import { useAppStore, useCurrentUser, useIsEditMode } from '@/stores/appStore'; 

interface DashboardHeaderControlProps {
  plcStatus: "online" | "offline" | "disconnected"; isConnected: boolean; connectWebSocket: () => void;
  soundEnabled: boolean; setSoundEnabled: Dispatch<SetStateAction<boolean>>; currentTime: string; delay: number;
  version: string; onOpenConfigurator: () => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  currentUserRole?: UserRole;
  onRemoveAll: () => void; onResetToDefault: () => void;
}

const DashboardHeaderControl: React.FC<DashboardHeaderControlProps> = React.memo(
  ({
    plcStatus, isConnected, connectWebSocket, soundEnabled, setSoundEnabled, currentTime, delay,
    version, onOpenConfigurator, isEditMode, toggleEditMode, currentUserRole, onRemoveAll, onResetToDefault,
  }) => {
    const router = useRouter(); 
    const currentPathname = usePathname();
    const headerTitle = currentPathname?.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';
    const isAdmin = currentUserRole === UserRole.ADMIN;

    const navigateToResetPage = () => {
      router.push('/reset');
    };

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
            <motion.div variants={itemVariants}><PlcConnectionStatus status={plcStatus} /></motion.div>
            <motion.div variants={itemVariants}><WebSocketStatus isConnected={isConnected} connectFn={connectWebSocket} /></motion.div>
            <motion.div variants={itemVariants}><SoundToggle soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} /></motion.div>
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
              <Button variant="ghost" size="sm" className="px-1.5 py-0.5 h-auto text-xs text-muted-foreground hover:text-foreground" onClick={connectWebSocket} title="Attempt manual WebSocket reconnection">
                <Power className="mr-1 h-3 w-3" /> Reconnect
              </Button>
            )}
          </div>
          <span className='font-mono'>{version || '?.?.?'}</span>
        </motion.div>
      </>
    );
  });

interface HeaderConnectivityComponentProps extends DashboardHeaderControlProps { }
const HeaderConnectivityComponent: React.FC<HeaderConnectivityComponentProps> = (props) => {
  return <DashboardHeaderControl {...props} />;
};


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

const PAGE_SLUG = 'control_dashboard'; 
const GRAPH_CONFIG_KEY_PREFIX = `powerGraphConfig_${PLANT_NAME.replace(/\s+/g, '_')}_${PAGE_SLUG}`;
const GRAPH_GEN_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_generationDpIds`;
const GRAPH_USAGE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_usageDpIds`;
const GRAPH_EXPORT_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_exportDpIds`;
const GRAPH_EXPORT_MODE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_exportMode`;
const GRAPH_DEMO_MODE_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_demoMode`;
const GRAPH_TIMESCALESETTING_KEY = `${GRAPH_CONFIG_KEY_PREFIX}_timeScaleSetting`;

const DEFAULT_DISPLAY_COUNT = 6;
const CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD = 4;
const OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD = 4;

const UnifiedDashboardPage: React.FC = () => {
  const router = useRouter();
  const currentPath = usePathname();
  const currentUser = useCurrentUser();
  const storeHasHydrated = useAppStore.persist.hasHydrated();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  const { isEditMode: isGlobalEditMode, toggleEditMode: toggleEditModeAction } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    toggleEditMode: state.toggleEditMode,
  }));

  useEffect(() => { /* ... initDB ... */ 
    initDB().catch(console.error); ensureAppConfigIsSaved();
  }, []); 

  useEffect(() => { /* ... auth check ... */
    if (!storeHasHydrated) return;
    if (!currentUser?.email || currentUser.email === 'guest@example.com') {
      toast.error("Auth Required", { description: "Please log in." });
      router.replace('/login');
    } else { setAuthCheckComplete(true); }
  }, [currentUser, router, storeHasHydrated, currentPath]);

  const { resolvedTheme } = useTheme();
  const [nodeValues, setNodeValues] = useState<NodeData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [plcStatus, setPlcStatus] = useState<'online' | 'offline' | 'disconnected'>('disconnected');
  const [currentTime, setCurrentTime] = useState<string>('');
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [delay, setDelay] = useState<number>(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10; 
  const lastToastTimestamps = useRef<Record<string, number>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => typeof window !== 'undefined' ? localStorage.getItem('dashboardSoundEnabled') === 'true' : false);
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [isSldModalOpen, setIsSldModalOpen] = useState(false); 
  const [isModalSldLayoutConfigOpen, setIsModalSldLayoutConfigOpen] = useState(false);
  const [isSldConfigOpen, setIsSldConfigOpen] = useState(false);

  const currentUserRole = currentUser?.role;
  const [sldLayoutId, setSldLayoutId] = useState<string>(() => { /* ... unchanged ... */
      if (typeof window !== 'undefined') { const s=localStorage.getItem(DEFAULT_SLD_LAYOUT_ID_KEY); if(s&&AVAILABLE_SLD_LAYOUT_IDS.includes(s))return s;} return AVAILABLE_SLD_LAYOUT_IDS[0]||'main_plant';
  });
  const allPossibleDataPoints = useMemo(() => allPossibleDataPointsConfig, []);

  const playNotificationSound = useCallback((type: 'success'|'error'|'warning'|'info')=>{/* ... unchanged ... */ if(!soundEnabled)return;const sM={success:'/sounds/success.mp3',error:'/sounds/error.mp3',warning:'/sounds/warning.mp3',info:'/sounds/info.mp3'};const vM={success:0.99,error:0.6,warning:0.5,info:0.3};if(typeof playSound==='function')playSound(sM[type],vM[type]);},[soundEnabled]);
  const processControlActionQueue = useCallback(async () => { /* ... unchanged ... */
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) { return; }
    const qA = await getControlQueue(); if(qA.length===0) return;
    console.log(`Processing ${qA.length} actions...`); toast.info("Processing Queued Actions", { description: `Found ${qA.length} pending command(s).`});
    let allOk=true; for(const a of qA){try{ws.current.send(JSON.stringify({[a.nodeId]:a.value}));}catch(e){allOk=false;console.error(`Fail queue ${a.nodeId}:`,e);toast.error("Queue Fail",{description:`Cmd ${a.nodeId||'??'} fail.`});}}
    await clearControlQueue(); if(allOk)toast.success("Queue OK",{description:"All sent."});else toast.warning("Queue Incomplete");
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!authCheckComplete) return;
    const f1 = 'opcuaRedirected', f2 = 'reloadingDueToDelay', f3 = 'redirectingDueToExtremeDelay';
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;
    if (typeof window !== 'undefined' && (sessionStorage.getItem(f1) || sessionStorage.getItem(f2) || sessionStorage.getItem(f3))) return;

    setIsConnected(false);
    const delayMs = Math.min(1000 + 2000 * Math.pow(1.5, reconnectAttempts.current), 30000);
    if (reconnectInterval.current) clearTimeout(reconnectInterval.current);

    reconnectInterval.current = setTimeout(async () => {
      if (typeof window === 'undefined') return;

      try {
        console.log("Attempting to contact /api/opcua endpoint before WebSocket connection...");
        const response = await fetch('/api/opcua');
        if (response.ok) {
          console.log("/api/opcua endpoint reached successfully.");
          // Potentially, response could provide a dynamic WS_URL, but for now, assume it's a status check/trigger.
        } else {
          console.warn(`/api/opcua endpoint returned an error: ${response.status}. Proceeding with WebSocket connection attempt anyway.`);
          toast.warning("OPC UA API Check", { description: `Endpoint /api/opcua status: ${response.status}. Will still attempt WS connection.` });
        }
      } catch (error) {
        console.error("Error fetching /api/opcua:", error, "Proceeding with WebSocket connection attempt anyway.");
        toast.error("OPC UA API Error", { description: "Could not reach /api/opcua. Will still attempt WS connection." });
      }
      
      console.log("Attempting WebSocket connection to:", WS_URL);
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("WS Open:", WS_URL);
        setIsConnected(true);
        setLastUpdateTime(Date.now());
        reconnectAttempts.current = 0;
        if (reconnectInterval.current) clearTimeout(reconnectInterval.current);
        toast.success('WS Connected', { id: 'ws-conn', description: 'Backend connected.', duration: 3000 });
        playNotificationSound('success');
        if (typeof window !== 'undefined') { [f1, f2, f3].forEach(f => sessionStorage.removeItem(f)); }
        processControlActionQueue();
      };

      ws.current.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string);
          if (typeof d === 'object' && d !== null) {
            setNodeValues(p => ({ ...p, ...d }));
            setLastUpdateTime(Date.now());
          } else console.warn("WS:non-obj", d);
        } catch (err) {
          console.error("WS parse err", err, e.data);
          playNotificationSound('error');
        }
      };

      ws.current.onerror = (ev) => {
        console.error("WS Err on", (ev.target as WebSocket)?.url, ev);
        setIsConnected(false);
        const t = ev.target as WebSocket;

        if (!t?.url?.includes(WS_URL)) {
          console.warn("WS error from unexpected URL:", t?.url);
          return;
        }

        // As per "websocket on error go to /api/opcua"
        console.log("WebSocket error occurred. Pinging /api/opcua as part of error handling.");
        fetch('/api/opcua')
          .then(res => {
            if (!res.ok) { 
              console.warn('Error pinging /api/opcua after WS error:', res.status); 
            } else { 
              console.log('Successfully pinged /api/opcua after WS error.'); 
            }
          })
          .catch(err => console.error('Failed to ping /api/opcua after WS error:', err));

        if (reconnectAttempts.current >= maxReconnectAttempts - 1) {
          toast.error('WS Critical', {
            description: 'Connection failed after retries.'
          });
          // The fetch('/api/opcua') above already happened. If a specific fetch was needed
          // *only* for max_retries, it would be here, but the instruction implies general on-error.
        }
      };

      ws.current.onclose = (ev) => {
        console.log(`WS Close: ${(ev.target as WebSocket)?.url} Code:${ev.code} Rsn:'${ev.reason || '-'}' Clean:${ev.wasClean}`);
        setIsConnected(false);
        if (ev.code === 1000 || ev.code === 1001 || ev.code === 1005 || ev.code === 1006 || (typeof window !== 'undefined' && (sessionStorage.getItem(f1) || sessionStorage.getItem(f2) || sessionStorage.getItem(f3)))) {
          reconnectAttempts.current = maxReconnectAttempts + 1; // Stop retrying for these specific close codes
          return;
        }
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Scheduling reconnect attempt ${reconnectAttempts.current} / ${maxReconnectAttempts} via onclose.`);
          connectWebSocket(); 
        } else {
          toast.error('WS Fail', { description: 'Max reconnects.' });
          playNotificationSound('error');
        }
      };
    }, delayMs);
  }, [authCheckComplete, playNotificationSound, processControlActionQueue, WS_URL, maxReconnectAttempts]);


  const sendDataToWebSocket = useCallback(async (nodeId:string,value:boolean|number|string)=>{ /* ... unchanged ... */
    if(currentUserRole===UserRole.VIEWER){toast.warning("Restricted",{description:"Viewers cannot send cmds."});playNotificationSound('warning');return;}const pC=allPossibleDataPoints.find(p=>p.nodeId===nodeId);let v:any=value,cQV:any=undefined;
    if(pC?.dataType.includes('Int')){let pN:number;if(typeof value==='boolean')pN=value?1:0;else if(typeof value==='string')pN=parseInt(value,10);else pN=value as number;if(isNaN(pN)){toast.error('Send Err',{description:'Invalid int.'});return;}v=pN;cQV=pN;}
    else if(pC?.dataType==='Boolean'){let pB:boolean;if(typeof value==='number')pB=value!==0;else if(typeof value==='string')pB=value.toLowerCase()==='true'||value==='1';else pB=value as boolean;v=pB;cQV=pB;}
    else if(pC?.dataType==='Float'||pC?.dataType==='Double'){let pF:number;if(typeof value==='string')pF=parseFloat(value);else pF=value as number;if(isNaN(pF)){toast.error('Send Err',{description:'Invalid num.'});return;}v=pF;cQV=pF;}
    if(typeof v==='number'&&!isFinite(v)){toast.error('Send Err',{description:'Num Inf/NaN.'});playNotificationSound('error');return;}
    if(ws.current&&ws.current.readyState===WebSocket.OPEN){try{const p=JSON.stringify({[nodeId]:v});ws.current.send(p);toast.info('Cmd Sent',{description:`${pC?.name||nodeId}=${String(v)}`});playNotificationSound('info');}catch(e){console.error("WS send err",e);toast.error('Send Err',{description:'Fail.Queuing.'});playNotificationSound('error');if(cQV!==undefined)await queueControlAction(nodeId,cQV);else toast.error('Queue Err',{description:`Cannot queue ${nodeId}.`});}}
    else{toast.warning('Offline',{description:`Cmd ${pC?.name||nodeId} queued.`});playNotificationSound('warning');if(cQV!==undefined)await queueControlAction(nodeId,cQV);else toast.error('Queue Err',{description:`Cannot queue ${nodeId}.`});if(!isConnected&&authCheckComplete)connectWebSocket();}
  }, [isConnected,connectWebSocket,allPossibleDataPoints,playNotificationSound,currentUserRole,authCheckComplete]);

  useEffect(() => { /* ... localStorage for sldLayoutId ... */ if (typeof window !== 'undefined' && authCheckComplete) localStorage.setItem(DEFAULT_SLD_LAYOUT_ID_KEY, sldLayoutId); }, [sldLayoutId, authCheckComplete]);
  const getHardcodedDefaultDataPointIds = useCallback(() => { /* ... unchanged ... */ const cIds=['grid-total-active-power-side-to-side','inverter-output-total-power','load-total-power','battery-capacity','battery-output-power','input-power-pv1'].filter(id=>allPossibleDataPoints.some(dp=>dp.id===id));if(cIds.length>0)return cIds;return allPossibleDataPoints.slice(0,DEFAULT_DISPLAY_COUNT).map(dp=>dp.id);},[allPossibleDataPoints]);
  const getSmartDefaults = useDynamicDefaultDataPointIds(allPossibleDataPoints);
  const [displayedDataPointIds, setDisplayedDataPointIds] = useState<string[]>([]);
  useEffect(() => { /* ... localStorage for displayedDataPointIds ... */ if(typeof window!=='undefined'&&allPossibleDataPoints.length>0&&authCheckComplete){const s=localStorage.getItem(USER_DASHBOARD_CONFIG_KEY);if(s){try{const p=JSON.parse(s)as string[];const v=p.filter(id=>allPossibleDataPoints.some(dp=>dp.id===id));if(v.length>0){setDisplayedDataPointIds(v);return;}else if(p.length>0)localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY);}catch(e){console.error("Parse err",e);localStorage.removeItem(USER_DASHBOARD_CONFIG_KEY);}}const sm=getSmartDefaults();setDisplayedDataPointIds(sm.length>0?sm:getHardcodedDefaultDataPointIds());}},[allPossibleDataPoints,getSmartDefaults,getHardcodedDefaultDataPointIds,authCheckComplete]);
  useEffect(() => { /* ... localStorage for displayedDataPointIds on change ... */ if(typeof window!=='undefined'&&authCheckComplete){if(displayedDataPointIds.length>0)localStorage.setItem(USER_DASHBOARD_CONFIG_KEY,JSON.stringify(displayedDataPointIds));else if(localStorage.getItem(USER_DASHBOARD_CONFIG_KEY))localStorage.setItem(USER_DASHBOARD_CONFIG_KEY,JSON.stringify([]));}},[displayedDataPointIds,authCheckComplete]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('dashboardSoundEnabled', String(soundEnabled)); }, [soundEnabled]);
  const currentlyDisplayedDataPoints = useMemo(() => displayedDataPointIds.map(id => allPossibleDataPoints.find(dp => dp.id === id)).filter(Boolean) as DataPoint[], [displayedDataPointIds, allPossibleDataPoints]);
  useEffect(() => {const uc=()=>setCurrentTime(new Date().toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,day:'2-digit',month:'short',year:'numeric'}));uc();const i=setInterval(uc,1000);return()=>clearInterval(i);},[]);
  useEffect(() => { /* ... lagCheckInterval ... */
    if (!authCheckComplete) return; const lagI=setInterval(()=>{const cD=Date.now()-lastUpdateTime;setDelay(cD);const fS=typeof window!=='undefined'&&['reloadingDueToDelay','redirectingDueToExtremeDelay','opcuaRedirected'].some(f=>sessionStorage.getItem(f));if(fS)return;
    if(isConnected&&cD>60000){console.error(`CRIT WS lag(${(Number(cD)/1000).toFixed(1)}s).Closing WS.`);toast.error('Critical Lag',{id:'ws-lag',description:'Re-establishing...',duration:10000});if(ws.current)ws.current.close(1011,"Crit Lag");return;}
    else if(isConnected&&cD>30000){console.warn(`High WS lag(${(Number(cD)/1000).toFixed(1)}s).`);toast.warning('Stale Warn',{id:'ws-stale',description:`Last upd >${(Number(cD)/1000).toFixed(0)}s ago.`,duration:8000});}},15000);return()=>clearInterval(lagI);
  }, [lastUpdateTime, isConnected, playNotificationSound, authCheckComplete]);
  const checkPlcConnection = useCallback(async () => { /* ... unchanged, reduced noise ... */ if(!authCheckComplete)return;try{const r=await fetch('/api/opcua/status');if(!r.ok)throw new Error(`API Err:${r.status}`);const d=await r.json();const nS=d.connectionStatus;if(nS&&['online','offline','disconnected'].includes(nS))setPlcStatus(nS);else{if(plcStatus!=='disconnected')setPlcStatus('disconnected');}}catch(e){if(plcStatus!=='disconnected')setPlcStatus('disconnected');}},[plcStatus,authCheckComplete]);
  useEffect(() => {if (!authCheckComplete) return ()=>{}; checkPlcConnection(); const plcI=setInterval(checkPlcConnection,15000); return()=>clearInterval(plcI);},[checkPlcConnection,authCheckComplete]);
  useEffect(() => {  /* ... unchanged WebSocket setup/teardown ... */
    if (!authCheckComplete) return ()=>{}; if(typeof window==='undefined')return;
    ['opcuaRedirected','reloadingDueToDelay','redirectingDueToExtremeDelay'].forEach(f=>sessionStorage.removeItem(f));
    reconnectAttempts.current=0;connectWebSocket();
    return()=>{if(reconnectInterval.current)clearTimeout(reconnectInterval.current);if(ws.current&&ws.current.readyState!==WebSocket.CLOSED){console.log("Unmounting, closing WS.");ws.current.onopen=null;ws.current.onmessage=null;ws.current.onerror=null;ws.current.onclose=null;ws.current.close(1000,'Unmounted');ws.current=null;}};
  }, [connectWebSocket, authCheckComplete]);

  const { threePhaseGroups, individualPoints } = useMemo(() => groupDataPoints(currentlyDisplayedDataPoints), [currentlyDisplayedDataPoints]);
  const controlItems = useMemo(() => individualPoints.filter(p => p.uiType === 'button' || p.uiType === 'switch'), [individualPoints]);
  const statusDisplayItems = useMemo(() => individualPoints.filter(p => p.category === 'status' && p.uiType === 'display'), [individualPoints]);
  const gaugeItems = useMemo(() => individualPoints.filter(p => p.uiType === 'gauge'), [individualPoints]);
  const otherDisplayItems = useMemo(() => individualPoints.filter(p => p.uiType === 'display' && p.category !== 'status'), [individualPoints]);
  const topSections = useMemo<SectionToRender[]>(() => { /* ... unchanged ... */ const s: SectionToRender[] = []; const cGC = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'; const bC=controlItems.length>CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD; const bS=statusDisplayItems.length>CONTROLS_AND_STATUS_BREAKOUT_THRESHOLD; if(bC||bS){if(statusDisplayItems.length>0)s.push({title:"Status Readings",items:statusDisplayItems,gridCols:cGC}); if(controlItems.length>0)s.push({title:"Controls",items:controlItems,gridCols:cGC});}else{const cI=[...statusDisplayItems,...controlItems];if(cI.length>0)s.push({title:"Controls & Status",items:cI,gridCols:cGC});} return s; }, [controlItems, statusDisplayItems]);
  const gaugesOverviewSectionDefinition = useMemo<SectionToRender | null>(() => { /* ... unchanged ... */ if(gaugeItems.length>0)return{title:"Gauges & Overview",items:gaugeItems,gridCols:'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'};return null;},[gaugeItems]);
  const bottomReadingsSections = useMemo<SectionToRender[]>(() => { /* ... unchanged ... */ if(otherDisplayItems.length===0)return[];const cGC='grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';const s:SectionToRender[]=[];const dBC=otherDisplayItems.reduce((acc,p)=>{const k=p.category||'miscellaneous';if(!acc[k])acc[k]=[];acc[k].push(p);return acc;},{}as Record<string,DataPoint[]>);const gORP:DataPoint[]=[];Object.entries(dBC).sort(([a],[b])=>a.localeCompare(b)).forEach(([cat,pts])=>{if(pts.length>OTHER_READINGS_CATEGORY_BREAKOUT_THRESHOLD)s.push({title:`${cat.charAt(0).toUpperCase()+cat.slice(1)} Readings`,items:pts,gridCols:cGC});else gORP.push(...pts);});if(gORP.length>0){const oRS:SectionToRender={title:"Other Readings",items:gORP,gridCols:cGC};if(s.some(sec=>sec.title!=="Other Readings"))s.push(oRS);else s.unshift(oRS);}return s.filter(sec=>sec.items.length>0);},[otherDisplayItems]);
  const cardHoverEffect = useMemo(() => (resolvedTheme === 'dark' ? { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.15), 0 5px 8px -5px rgba(0,0,0,0.2)", transition: { type: 'spring', stiffness: 350, damping: 20 } } : { y: -4, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.08), 0 5px 8px -5px rgba(0,0,0,0.08)", transition: { type: 'spring', stiffness: 350, damping: 20 } }), [resolvedTheme]);
  const handleResetToDefault = useCallback(() => { /* ... unchanged ... */ if(currentUserRole!==UserRole.ADMIN)return;const sD=getSmartDefaults();setDisplayedDataPointIds(sD.length>0?sD:getHardcodedDefaultDataPointIds());toast.info("Layout reset.");},[getSmartDefaults,getHardcodedDefaultDataPointIds,currentUserRole]);
  const handleRemoveAllItems = useCallback(() => { /* ... unchanged ... */ if(currentUserRole!==UserRole.ADMIN)return;setDisplayedDataPointIds([]);toast.info("All cards removed.");},[currentUserRole]);
  const handleAddMultipleDataPoints = useCallback((sIds:string[]) => { /* ... unchanged ... */ if(currentUserRole!==UserRole.ADMIN)return;const cDS=new Set(displayedDataPointIds);const tNI=sIds.filter(id=>!cDS.has(id));if(tNI.length===0&&sIds.length>0){toast.warning("Items already shown or none selected.");return;}if(tNI.length>0){setDisplayedDataPointIds(pIds=>Array.from(new Set([...pIds,...tNI])));toast.success(`${tNI.length} new DP${tNI.length>1?'s':''} added.`);}setIsConfiguratorOpen(false);},[displayedDataPointIds,currentUserRole]);
  const handleRemoveItem = useCallback((dpIdToRemove:string)=>{ /* ... unchanged ... */ if(currentUserRole!==UserRole.ADMIN)return;const pTR=allPossibleDataPoints.find(dp=>dp.id===dpIdToRemove);if(pTR?.threePhaseGroup){const gIds=allPossibleDataPoints.filter(dp=>dp.threePhaseGroup===pTR.threePhaseGroup).map(dp=>dp.id);setDisplayedDataPointIds(pIs=>pIs.filter(id=>!gIds.includes(id)));toast.info(`${pTR.threePhaseGroup} group removed.`);}else{setDisplayedDataPointIds(pIs=>pIs.filter(id=>id!==dpIdToRemove));toast.info("DP removed.");}},[allPossibleDataPoints,currentUserRole]);
  const { threePhaseGroupsForConfig, individualPointsForConfig } = useMemo(() => { /* ... unchanged ... */ const g:Record<string,ConfiguratorThreePhaseGroup>={},i:DataPoint[]=[];const cS=new Set(displayedDataPointIds);allPossibleDataPoints.forEach(dp=>{if(dp.threePhaseGroup&&dp.phase&&['a','b','c','x','total'].includes(dp.phase)){if(!g[dp.threePhaseGroup]){let rN=dp.name.replace(/ (L[123]|Phase [ABCX]\b|Total\b)/ig,'').trim().replace(/ \([ABCX]\)$/i,'').trim();g[dp.threePhaseGroup]={name:dp.threePhaseGroup,representativeName:rN||dp.threePhaseGroup,ids:[],category:dp.category};}g[dp.threePhaseGroup].ids.push(dp.id);}else if(!dp.threePhaseGroup){i.push(dp);}});const aGA=Array.from(new Set(Object.values(g).flatMap(grp=>grp.ids)));const tIP=i.filter(ind=>!aGA.includes(ind.id));const cDA=Array.from(cS);return{threePhaseGroupsForConfig:Object.values(g).filter(grp=>grp.ids.some(id=>!cDA.includes(id))).sort((a,b)=>a.representativeName.localeCompare(b.representativeName)),individualPointsForConfig:tIP.filter(dp=>!cDA.includes(dp.id)).sort((a,b)=>a.name.localeCompare(b.name))};}, [allPossibleDataPoints, displayedDataPointIds]);
  
  const sldSpecificEditMode = isGlobalEditMode && currentUserRole === UserRole.ADMIN;
  const sldSectionMinHeight = "min-h-[350px] sm:min-h-[400px]";
const sldInternalMaxHeight = `calc(60vh - 3.5rem)`;

  const commonRenderingProps = {
    isEditMode: isGlobalEditMode,
    nodeValues, isConnected, currentHoverEffect: cardHoverEffect, sendDataToWebSocket,
    playNotificationSound, lastToastTimestamps, onRemoveItem: handleRemoveItem,
    allPossibleDataPoints, containerVariants, currentUserRole,
  };
  
  const hasAnyDynamicCardContent = topSections.length > 0 || !!gaugesOverviewSectionDefinition || bottomReadingsSections.length > 0;
  
  const [graphTimeScale, setGraphTimeScale] = useState<TimeScale>(() => { 
      if(typeof window!=='undefined'){const sT=localStorage.getItem(GRAPH_TIMESCALESETTING_KEY);if(sT&&['30s', '1m', '5m', '30m', '1h', '6h', '12h', '1d', '7d', '1mo'].includes(sT))return sT as TimeScale;}return '1m';
  });

  // Initialize ALL graph related states together
  const [isGraphConfiguratorOpen, setIsGraphConfiguratorOpen] = useState(false);
  const [powerGraphGenerationDpIds, setPowerGraphGenerationDpIds] = useState<string[]>([]);
  const [powerGraphUsageDpIds, setPowerGraphUsageDpIds] = useState<string[]>([]);
  const [powerGraphExportDpIds, setPowerGraphExportDpIds] = useState<string[]>([]);
  const [powerGraphExportMode, setPowerGraphExportMode] = useState<'auto' | 'manual'>('auto');
  const [useDemoDataForGraph, setUseDemoDataForGraph] = useState<boolean>(false);


  // Load graph configuration from localStorage AFTER authCheckComplete
  useEffect(() => {
    if (typeof window !== 'undefined' && authCheckComplete) {
        setPowerGraphGenerationDpIds(JSON.parse(localStorage.getItem(GRAPH_GEN_KEY) || '["inverter-output-total-power"]'));
        setPowerGraphUsageDpIds(JSON.parse(localStorage.getItem(GRAPH_USAGE_KEY) || '["grid-total-active-power-side-to-side"]'));
        setPowerGraphExportDpIds(JSON.parse(localStorage.getItem(GRAPH_EXPORT_KEY) || '[]'));
        setPowerGraphExportMode((localStorage.getItem(GRAPH_EXPORT_MODE_KEY) as ('auto'|'manual')) || 'auto');
        setUseDemoDataForGraph(localStorage.getItem(GRAPH_DEMO_MODE_KEY) === 'true');
        setGraphTimeScale((localStorage.getItem(GRAPH_TIMESCALESETTING_KEY) as TimeScale) || '1m');
    }
  }, [authCheckComplete]); // Only run once after auth check

  // Persist ALL graph config to localStorage when any of them change
  useEffect(() => {
    if (typeof window !== 'undefined' && authCheckComplete) { // Ensure not to run on initial SSR or before auth
      localStorage.setItem(GRAPH_GEN_KEY, JSON.stringify(powerGraphGenerationDpIds));
      localStorage.setItem(GRAPH_USAGE_KEY, JSON.stringify(powerGraphUsageDpIds));
      localStorage.setItem(GRAPH_EXPORT_KEY, JSON.stringify(powerGraphExportDpIds));
      localStorage.setItem(GRAPH_EXPORT_MODE_KEY, powerGraphExportMode);
      localStorage.setItem(GRAPH_DEMO_MODE_KEY, String(useDemoDataForGraph));
      localStorage.setItem(GRAPH_TIMESCALESETTING_KEY, graphTimeScale);
    }
  }, [
    powerGraphGenerationDpIds, powerGraphUsageDpIds, powerGraphExportDpIds, 
    powerGraphExportMode, useDemoDataForGraph, graphTimeScale, authCheckComplete
  ]);

  if (!storeHasHydrated || !authCheckComplete) { /* ... unchanged loading screen ... */
    return(<div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground"><Loader2 className="h-12 w-12 animate-spin text-primary"/><p className="mt-4 text-lg">Loading Control Panel...</p></div>);
  }

  const handleSldLayoutSelect = (newLayoutId: string) => { setSldLayoutId(newLayoutId); setIsSldConfigOpen(false); };

  return (
    <div className="bg-background text-foreground px-2 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300 pb-8">
      <div className="max-w-screen-4xl mx-auto">
        <HeaderConnectivityComponent
          plcStatus={plcStatus} isConnected={isConnected} connectWebSocket={connectWebSocket}
          soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} currentTime={currentTime} delay={delay}
          version={VERSION}
          isEditMode={isGlobalEditMode} 
          toggleEditMode={toggleEditModeAction}
          currentUserRole={currentUserRole}
          onOpenConfigurator={() => { if (currentUserRole === UserRole.ADMIN) setIsConfiguratorOpen(true); else toast.warning("Access Denied", { description: "Only administrators can add cards." }); }}
          onRemoveAll={handleRemoveAllItems} onResetToDefault={handleResetToDefault} />

        {topSections.length > 0 && (<RenderingComponent sections={topSections} {...commonRenderingProps} />)}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 xl:gap-4 my-4 md:my-6">
          <Card className={cn("lg:col-span-3 shadow-lg", sldSectionMinHeight)}>
            <CardContent className="p-3 sm:p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-semibold">Plant Layout</h3>
                    {sldSpecificEditMode && (
                        <Dialog open={isSldConfigOpen} onOpenChange={setIsSldConfigOpen}>
                            <DialogTrigger asChild><Button variant="outline"size="sm"className="h-7 px-2 text-xs"><LayoutList className="h-3.5 w-3.5 mr-1.5"/>Configure Layout: {sldLayoutId.replace(/_/g, ' ').replace(/\b\w/g, l=>l.toUpperCase())}</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]"><DialogHeaderComponentInternal><DialogTitleComponentInternal>Select SLD Layout</DialogTitleComponentInternal></DialogHeaderComponentInternal>
                                <div className="py-4"><Select onValueChange={handleSldLayoutSelect} value={sldLayoutId}><SelectTrigger className="w-full mb-2"><SelectValue placeholder="Choose..."/></SelectTrigger><SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.filter(Boolean).map(id=><SelectItem key={id}value={String(id)}>{String(id).replace(/_/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground mt-2">Select SLD. Changes client-side until saved in editor.</p></div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {!sldSpecificEditMode && sldLayoutId && <span className="text-lg font-semibold text-muted-foreground ml-1"> : {sldLayoutId.replace(/_/g, ' ').replace(/\b\w/g, l=>l.toUpperCase())}</span>}
                </div>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost"size="icon"onClick={()=>setIsSldModalOpen(true)}title="Open SLD"><Maximize2 className="h-5 w-5"/><span className="sr-only">Open SLD</span></Button></TooltipTrigger><TooltipContent><p>Open SLD in larger view</p></TooltipContent></Tooltip></TooltipProvider>
              </div>
              <div style={{height: sldInternalMaxHeight}} className="overflow-hidden rounded-md border flex-grow bg-muted/20 dark:bg-muted/10"><SLDWidget layoutId={sldLayoutId}isEditMode={sldSpecificEditMode}/></div>
            </CardContent>
          </Card>
          <Card className={cn("shadow-lg", sldSectionMinHeight)}>
            <CardContent className="p-3 sm:p-4 h-full flex flex-col">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Three-Phase Elements</h3>
              <div className="overflow-y-auto flex-grow" style={{maxHeight: sldInternalMaxHeight}}>{threePhaseGroups.length > 0 ? (<DashboardSection title="" gridCols="grid-cols-1 gap-y-3" items={threePhaseGroups} isDisabled={!isConnected} {...commonRenderingProps} />) : (<p className="text-muted-foreground italic text-sm pt-2"> {displayedDataPointIds.length > 0 ? "No three-phase groups." : "Add data points."} </p>)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl my-4 md:my-6 border-2 border-primary/20 dark:border-primary/30">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl sm:text-2xl">Energy Timeline</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end sm:justify-start">
                 {isGlobalEditMode && currentUserRole === UserRole.ADMIN && (
                    <>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7" onClick={()=>setIsGraphConfiguratorOpen(true)}><Settings className="h-4 w-4"/><span className="sr-only">Config Graph</span></Button></TooltipTrigger><TooltipContent><p>Configure Graph Data</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={useDemoDataForGraph?"secondary":"outline"}size="icon"className="h-7 w-7"onClick={()=>setUseDemoDataForGraph(prev => !prev)}><Orbit className={cn("h-4 w-4",useDemoDataForGraph && "animate-spin-slow")}/><span className="sr-only">Demo Data</span></Button></TooltipTrigger><TooltipContent><p>{useDemoDataForGraph?"Switch to Live Data":"Switch to Demo Data"}</p></TooltipContent></Tooltip></TooltipProvider>
                    </>
                 )}
                {(['30s', '1m', '5m', '30m', '1h', '6h', '12h', '1d', '7d', '1mo'] as TimeScale[]).map((ts) => (
                  <Button key={ts} variant={graphTimeScale === ts ? "default" : "outline"} size="sm" onClick={() => setGraphTimeScale(ts)} className="text-xs px-2 py-1 h-auto">
                    {ts.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 py-3 sm:px-3">
            {(useDemoDataForGraph || (powerGraphGenerationDpIds && powerGraphGenerationDpIds.length > 0) || (powerGraphUsageDpIds && powerGraphUsageDpIds.length > 0) ) ? (
              <PowerTimelineGraph
                nodeValues={nodeValues}
                allPossibleDataPoints={allPossibleDataPoints}
                generationDpIds={powerGraphGenerationDpIds} 
                usageDpIds={powerGraphUsageDpIds} 
                exportDpIds={powerGraphExportDpIds} 
                exportMode={powerGraphExportMode} 
                timeScale={graphTimeScale}
                isLive={isConnected && plcStatus === 'online'}
                useDemoData={useDemoDataForGraph}
              />
            ) : ( 
              <div className="flex items-center justify-center h-[300px] text-muted-foreground"><p>Graph data points not configured.{isGlobalEditMode&&currentUserRole===UserRole.ADMIN&&" Click settings."}</p></div>
            )}
          </CardContent>
        </Card>
        
        {gaugesOverviewSectionDefinition && (<RenderingComponent sections={[gaugesOverviewSectionDefinition]} {...commonRenderingProps} />)}
        {bottomReadingsSections.length > 0 && (<RenderingComponent sections={bottomReadingsSections} {...commonRenderingProps} />)}
        {!hasAnyDynamicCardContent && currentlyDisplayedDataPoints.length > 0 && (<div className="text-center py-16 text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"> <InfoIconLucide className="w-12 h-12 mb-4 text-gray-400" /><h3 className="text-xl font-semibold mb-2">No items match filters.</h3> <p>Selected data points might not fit configured dynamic sections.</p> {(isGlobalEditMode && currentUserRole === UserRole.ADMIN) && <p className="mt-2">Try changing data point types/categories.</p>} </div>)}
        {!hasAnyDynamicCardContent && currentlyDisplayedDataPoints.length === 0 && (<RenderingComponent sections={[]} {...commonRenderingProps} />)}
      </div>

      {(isConfiguratorOpen && currentUserRole === UserRole.ADMIN) && (<DashboardItemConfigurator isOpen={isConfiguratorOpen} onClose={() => setIsConfiguratorOpen(false)} availableIndividualPoints={individualPointsForConfig} availableThreePhaseGroups={threePhaseGroupsForConfig} currentDisplayedIds={displayedDataPointIds} onAddMultipleDataPoints={handleAddMultipleDataPoints} onSaveNewDataPoint={async (data)=>{toast.info("Custom DP creation NI");return{success:false,error:"NI"};}}/>)}
      
      {isGraphConfiguratorOpen && (
        <PowerTimelineGraphConfigurator
          isOpen={isGraphConfiguratorOpen}
          onClose={()=>setIsGraphConfiguratorOpen(false)}
          allPossibleDataPoints={allPossibleDataPoints}
          currentGenerationDpIds={powerGraphGenerationDpIds}
          currentUsageDpIds={powerGraphUsageDpIds}
          currentExportDpIds={powerGraphExportDpIds}
          initialExportMode={powerGraphExportMode}
          onSaveConfiguration={(config)=>{
            setPowerGraphGenerationDpIds(config.generationDpIds);
            setPowerGraphUsageDpIds(config.usageDpIds);
            setPowerGraphExportDpIds(config.exportDpIds);
            setPowerGraphExportMode(config.exportMode);
            setIsGraphConfiguratorOpen(false);toast.success('Graph config updated.');
          }}/>
      )}

      <Dialog open={isSldModalOpen} onOpenChange={setIsSldModalOpen}>
          <DialogContent className="sm:max-w-[90vw] w-[95vw] h-[90vh] p-0 flex flex-col dark:bg-background bg-background border dark:border-slate-800">
            <DialogHeaderComponentInternal className="p-4 border-b dark:border-slate-700 flex flex-row justify-between items-center sticky top-0 bg-inherit z-10">
                <div className="flex items-center gap-2">
                    <DialogTitleComponentInternal>Plant Layout{!sldSpecificEditMode&&sldLayoutId&&` : ${sldLayoutId.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}`}</DialogTitleComponentInternal>
                    {sldSpecificEditMode && (<Dialog open={isModalSldLayoutConfigOpen} onOpenChange={setIsModalSldLayoutConfigOpen}><DialogTrigger asChild><Button variant="outline"size="sm"className="h-7 px-2 text-xs"><LayoutList className="h-3.5 w-3.5 mr-1.5"/>Layout: {sldLayoutId.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Button></DialogTrigger><DialogContent className="sm:max-w-[425px]"><DialogHeaderComponentInternal><DialogTitleComponentInternal>Select SLD Layout</DialogTitleComponentInternal></DialogHeaderComponentInternal><div className="py-4"><Select onValueChange={(v)=>{setSldLayoutId(v);setIsModalSldLayoutConfigOpen(false);}}value={sldLayoutId}><SelectTrigger className="w-full mb-2"><SelectValue placeholder="Choose..."/></SelectTrigger><SelectContent>{AVAILABLE_SLD_LAYOUT_IDS.filter(Boolean).map((id)=><SelectItem key={id}value={String(id)}>{String(id).replace(/_/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground mt-2">Select SLD. Changes client-side until saved in editor.</p></div></DialogContent></Dialog>)}
                </div>
                <DialogClose asChild><Button variant="ghost"size="icon"className="rounded-full"><X className="h-5 w-5"/><span className="sr-only">Close</span></Button></DialogClose>
            </DialogHeaderComponentInternal>
            <div className="flex-grow p-2 sm:p-4 overflow-hidden"><SLDWidget layoutId={sldLayoutId}isEditMode={sldSpecificEditMode}/></div>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedDashboardPage;