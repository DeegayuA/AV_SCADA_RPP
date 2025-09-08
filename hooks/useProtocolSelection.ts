// hooks/useProtocolSelection.ts
import { useState, useEffect, useCallback } from 'react';
import { PROTOCOL_STORAGE_KEY, AVAILABLE_PROTOCOLS, type ProtocolType } from '@/config/constants';

interface ProtocolConfig {
  opcua: {
    endpoint: string;
    websocketUrl: string;
  };
  snap7: {
    plcIP: string;
    plcRack: number;
    plcSlot: number;
    websocketUrl: string;
  };
}

interface UseProtocolSelectionReturn {
  selectedProtocol: ProtocolType;
  setSelectedProtocol: (protocol: ProtocolType) => void;
  protocolConfig: ProtocolConfig;
  updateProtocolConfig: (protocol: ProtocolType, config: Partial<ProtocolConfig[ProtocolType]>) => void;
  isOpcuaSelected: boolean;
  isSnap7Selected: boolean;
}

export function useProtocolSelection(): UseProtocolSelectionReturn {
  const [selectedProtocol, setSelectedProtocolState] = useState<ProtocolType>('opcua');
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>({
    opcua: {
      endpoint: 'opc.tcp://localhost:48010',
      websocketUrl: 'ws://localhost:2001'
    },
    snap7: {
      plcIP: '192.168.1.100',
      plcRack: 0,
      plcSlot: 2,
      websocketUrl: 'ws://localhost:8080'
    }
  });

  // Load saved protocol selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PROTOCOL_STORAGE_KEY);
        if (saved && AVAILABLE_PROTOCOLS.includes(saved as ProtocolType)) {
          setSelectedProtocolState(saved as ProtocolType);
        }

        // Load protocol configurations
        const opcuaConfig = localStorage.getItem(`${PROTOCOL_STORAGE_KEY}_opcua_config`);
        const snap7Config = localStorage.getItem(`${PROTOCOL_STORAGE_KEY}_snap7_config`);

        if (opcuaConfig) {
          try {
            const parsed = JSON.parse(opcuaConfig);
            setProtocolConfig(prev => ({
              ...prev,
              opcua: { ...prev.opcua, ...parsed }
            }));
          } catch (error) {
            console.warn('Failed to parse saved OPC UA config:', error);
          }
        }

        if (snap7Config) {
          try {
            const parsed = JSON.parse(snap7Config);
            setProtocolConfig(prev => ({
              ...prev,
              snap7: { ...prev.snap7, ...parsed }
            }));
          } catch (error) {
            console.warn('Failed to parse saved Snap7 config:', error);
          }
        }
      } catch (error) {
        console.warn('Failed to load protocol selection from localStorage:', error);
      }
    }
  }, []);

  // Save protocol selection to localStorage
  const setSelectedProtocol = useCallback((protocol: ProtocolType) => {
    setSelectedProtocolState(protocol);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROTOCOL_STORAGE_KEY, protocol);
      } catch (error) {
        console.warn('Failed to save protocol selection to localStorage:', error);
      }
    }
  }, []);

  // Update protocol configuration
  const updateProtocolConfig = useCallback((protocol: ProtocolType, config: Partial<ProtocolConfig[ProtocolType]>) => {
    setProtocolConfig(prev => ({
      ...prev,
      [protocol]: { ...prev[protocol], ...config }
    }));

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        const updatedConfig = { ...protocolConfig[protocol], ...config };
        localStorage.setItem(`${PROTOCOL_STORAGE_KEY}_${protocol}_config`, JSON.stringify(updatedConfig));
      } catch (error) {
        console.warn(`Failed to save ${protocol} config to localStorage:`, error);
      }
    }
  }, [protocolConfig]);

  return {
    selectedProtocol,
    setSelectedProtocol,
    protocolConfig,
    updateProtocolConfig,
    isOpcuaSelected: selectedProtocol === 'opcua',
    isSnap7Selected: selectedProtocol === 'snap7'
  };
}
