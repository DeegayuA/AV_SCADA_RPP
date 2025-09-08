# Protocol Connection Troubleshooting Guide

## Current Issues and Solutions

### 1. OPC UA Connection Problems

**Error**: `ClientTCP_transport3: socket has been disconnected by third party`
**Endpoint**: `opc.tcp://100.91.178.74:4840`

#### Possible Causes:
1. **Network connectivity issues**
2. **OPC UA server is down or not responding**
3. **Firewall blocking the connection**
4. **Wrong endpoint URL**
5. **Certificate/security issues**

#### Solutions:

1. **Check Network Connectivity**:
   ```bash
   ping 100.91.178.74
   telnet 100.91.178.74 4840
   ```

2. **Verify OPC UA Server Status**:
   - Ensure the OPC UA server is running
   - Check if the endpoint URL is correct
   - Verify the server allows connections

3. **Update Endpoint in Configuration**:
   - Go to `/protocol-config` page
   - Update the OPC UA endpoint to the correct address
   - Try alternative endpoints if available

### 2. Snap7 Protocol Setup

The Snap7 protocol is not starting automatically because it needs manual configuration.

#### To Enable Snap7:

1. **Go to Protocol Configuration**:
   - Navigate to `http://localhost:3000/protocol-config`
   - Switch to the "Snap7" tab

2. **Configure PLC Settings**:
   - **PLC IP Address**: Enter your Siemens PLC IP (e.g., `192.168.1.100`)
   - **Rack Number**: Usually `0` for most S7 PLCs
   - **Slot Number**: Usually `2` for CPU slot
   - **WebSocket URL**: `ws://localhost:8080`

3. **Connect to PLC**:
   - Click "Connect" button
   - Monitor the connection status

## Quick Protocol Switching

### Switch from OPC UA to Snap7:

1. **Using the UI**:
   - Go to `/protocol-config`
   - Click "Switch to Snap7" in Quick Actions
   - This will disconnect OPC UA and connect to Snap7

2. **Manual Steps**:
   - Disconnect OPC UA
   - Configure Snap7 settings
   - Connect to Snap7

### Benefits of Each Protocol:

#### OPC UA:
- ✅ Industry standard
- ✅ Built-in security
- ✅ Discovery capabilities
- ❌ More complex setup
- ❌ May require certificates

#### Snap7:
- ✅ Direct PLC communication
- ✅ Simple configuration
- ✅ Lower latency
- ❌ Siemens-specific
- ❌ Less security features

## Testing Steps

### 1. Test OPC UA:
```bash
# Check if OPC UA server is reachable
curl -v opc.tcp://100.91.178.74:4840
```

### 2. Test Snap7:
```bash
# Ping the PLC
ping 192.168.1.100

# Check if S7 communication port is open (usually 102)
telnet 192.168.1.100 102
```

## Configuration Files

### OPC UA Settings:
- Endpoint: Configured in `/protocol-config`
- Certificates: Stored in user preferences
- WebSocket: Port 2001

### Snap7 Settings:
- PLC IP: Configured in `/protocol-config`
- Data Points: Defined in `/config/snap7Config.ts`
- WebSocket: Port 8080

## Logs and Debugging

### Enable Debug Logs:
1. Open browser developer tools (F12)
2. Check console for errors
3. Monitor network tab for failed requests

### Common Error Messages:

1. **"Connection timeout"**:
   - Check network connectivity
   - Verify IP address and port

2. **"node-snap7 not available"**:
   - Run: `npm install node-snap7`
   - Restart the application

3. **"Data point not found"**:
   - Check data block configuration
   - Verify PLC program has the required DBs

## Next Steps

1. **Immediate Action**:
   - Go to `/protocol-config` page
   - Try connecting to Snap7 with your PLC settings
   - Test with the `/snap7-test` page

2. **For OPC UA Issues**:
   - Contact your OPC UA server administrator
   - Check if the endpoint URL has changed
   - Verify network connectivity to `100.91.178.74`

3. **For Production Use**:
   - Choose the protocol that best fits your setup
   - Configure proper network security
   - Set up monitoring and alerting
