// scripts/disable-opcua-auto-connect.js
// Run this script to disable OPC UA auto-connection and enable Snap7

const fs = require('fs');
const path = require('path');

// Configuration to disable OPC UA auto-connect
const opcuaConfigPath = path.join(__dirname, '..', 'app', 'api', 'opcua', 'route.ts');

console.log('🔧 Disabling OPC UA auto-connect...');

try {
  // Read the OPC UA route file
  let content = fs.readFileSync(opcuaConfigPath, 'utf8');
  
  // Find and replace the KEEP_OPCUA_ALIVE setting
  content = content.replace(
    'const KEEP_OPCUA_ALIVE = true;',
    'const KEEP_OPCUA_ALIVE = false;'
  );
  
  // Write back the modified content
  fs.writeFileSync(opcuaConfigPath, content);
  
  console.log('✅ OPC UA auto-connect disabled successfully!');
  console.log('📋 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Go to http://localhost:3001/protocol-config');
  console.log('3. Configure and connect to Snap7');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Set Snap7 as default protocol in localStorage script
const snap7DefaultScript = `
// Run this in your browser console to set Snap7 as default
localStorage.setItem('ranna_2mw_selected_protocol', 'snap7');
localStorage.setItem('ranna_2mw_snap7_config', JSON.stringify({
  plcIP: '192.168.1.100',
  plcRack: 0,
  plcSlot: 2,
  websocketUrl: 'ws://localhost:8080'
}));
console.log('Snap7 set as default protocol');
`;

fs.writeFileSync(path.join(__dirname, 'set-snap7-default.js'), snap7DefaultScript);
console.log('📄 Created browser script: scripts/set-snap7-default.js');
console.log('💡 You can copy and paste this script in your browser console to set Snap7 as default');
