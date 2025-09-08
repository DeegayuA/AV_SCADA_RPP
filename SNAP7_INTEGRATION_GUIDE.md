# Snap7 Integration Guide

This document explains how to integrate and use the Snap7 protocol with your SCADA system for communicating with Siemens S7 PLCs.

## Overview

Snap7 is an open-source library that provides direct communication with Siemens S7 PLCs using the S7 communication protocol. This integration allows your SCADA system to:

- Read/write data blocks from Siemens PLCs
- Monitor real-time PLC data
- Control PLC operations
- Handle multiple data types (BOOL, INT, REAL, etc.)

## Installation

The Snap7 integration has been added to your project with the following components:

### Dependencies Installed
- `node-snap7`: Node.js wrapper for the Snap7 library

### Files Added
1. `/config/snap7Config.ts` - Configuration for Snap7 data points and connection settings
2. `/app/api/snap7/route.ts` - Main API route for Snap7 communication
3. `/app/api/snap7/status/route.ts` - Status endpoint for Snap7 connection
4. `/hooks/useProtocolSelection.ts` - Hook for switching between OPC UA and Snap7
5. `/components/ProtocolSettings.tsx` - UI component for protocol configuration
6. `/app/snap7-test/page.tsx` - Test page for Snap7 functionality
7. `/types/node-snap7.d.ts` - TypeScript definitions for node-snap7

## Configuration

### PLC Connection Settings

Edit `/config/snap7Config.ts` to match your PLC configuration:

```typescript
export const defaultSnap7Config: Snap7Config = {
  plcIP: "192.168.1.100", // Your PLC IP address
  plcRack: 0,              // Usually 0 for most S7 PLCs
  plcSlot: 2,              // Usually 2 for CPU slot
  connectionType: 'PG',     // Connection type (PG, OP, or S7_BASIC)
  timeout: 5000,
  reconnectDelay: 5000,
  maxReconnectAttempts: 10
};
```

### Data Points Configuration

Define your PLC data points in `/config/snap7Config.ts`:

```typescript
export const snap7DataPoints: S7DataPoint[] = [
  {
    id: "grid_voltage_l1",
    label: "Grid Voltage L1",
    name: "Grid Voltage Phase 1",
    dbNumber: 2,        // Data Block number
    startByte: 0,       // Starting byte in the DB
    dataType: "REAL",   // Data type
    unit: "V",
    min: 0,
    max: 500,
    precision: 1,
    category: "electrical",
    uiType: "gauge"
  }
  // Add more data points as needed
];
```

## Supported Data Types

The Snap7 integration supports the following S7 data types:

- **BOOL**: Boolean values (with bit offset support)
- **BYTE**: 8-bit unsigned integer
- **WORD**: 16-bit unsigned integer  
- **DWORD**: 32-bit unsigned integer
- **INT**: 16-bit signed integer
- **DINT**: 32-bit signed integer
- **REAL**: 32-bit floating point
- **STRING**: Text strings

## Usage

### Starting the System

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Snap7 Test Page**:
   Navigate to `http://localhost:3000/snap7-test`

### API Endpoints

#### Connection Management
- **POST** `/api/snap7` with `action: "connect"` - Connect to PLC
- **POST** `/api/snap7` with `action: "disconnect"` - Disconnect from PLC

#### Data Operations
- **GET** `/api/snap7?action=status` - Get connection status
- **GET** `/api/snap7?action=data` - Get current data values
- **POST** `/api/snap7` with `action: "write"` - Write value to PLC

#### Example API Calls

Connect to PLC:
```javascript
const response = await fetch('/api/snap7', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'connect',
    config: {
      plcIP: '192.168.1.100',
      plcRack: 0,
      plcSlot: 2
    }
  })
});
```

Write a value:
```javascript
const response = await fetch('/api/snap7', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'write',
    dataPointId: 'main_breaker',
    value: true
  })
});
```

### WebSocket Real-Time Data

The system provides real-time data via WebSocket on port 8080:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'data' && message.protocol === 'snap7') {
    console.log('PLC Data:', message.data);
  }
};
```

## PLC Requirements

### Network Configuration
- Ensure the PLC is on the same network or accessible via routing
- Configure the PLC to allow connections (typically in Hardware Configuration)
- Verify the PLC's IP address, rack, and slot numbers

### PLC Programming
- Create Data Blocks (DBs) in your PLC program
- Organize data logically within the DBs
- Ensure data types match between PLC and SCADA configuration

### Example PLC Data Block Structure
```
DB2 (System Data):
  DBD0: REAL - Grid Voltage L1
  DBD4: REAL - Grid Voltage L2  
  DBD8: REAL - Grid Voltage L3
  DBD12: REAL - Grid Current L1
  DBD16: REAL - Grid Current L2
  DBD20: REAL - Grid Current L3
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check PLC IP address and network connectivity
   - Verify rack and slot numbers
   - Ensure PLC allows connections

2. **Data Reading Errors**
   - Verify Data Block numbers exist in PLC
   - Check byte offsets and data types
   - Ensure sufficient DB size for the data being read

3. **WebSocket Connection Issues**
   - Check if port 8080 is available
   - Verify firewall settings
   - Check browser console for errors

### Debug Mode

Enable detailed logging by checking the browser console and server logs. The API provides detailed error messages for troubleshooting.

## Integration with Existing System

### Protocol Selection

The system now supports both OPC UA and Snap7 protocols. Users can switch between protocols using the Protocol Settings component.

### Data Point Migration

If migrating from OPC UA to Snap7, you'll need to:

1. Map OPC UA node IDs to S7 data block addresses
2. Update data type definitions
3. Adjust any protocol-specific configurations

## Security Considerations

- Ensure network security between SCADA system and PLCs
- Consider using VPNs for remote connections
- Implement proper access controls for write operations
- Monitor and log all PLC communications

## Performance Optimization

- Adjust polling intervals based on data criticality
- Group related data points in the same data blocks
- Use appropriate data types to minimize bandwidth
- Consider using background processes for non-critical data

## Support

For issues specific to Snap7 integration:

1. Check the console logs for error messages
2. Verify PLC configuration and connectivity
3. Test with the provided Snap7 test page
4. Consult the Snap7 documentation for protocol-specific issues

For general SCADA system support, refer to the main documentation.
