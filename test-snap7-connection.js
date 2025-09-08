// test-snap7-connection.js
// Simple test script to check Snap7 connectivity

const snap7 = require('node-snap7');

async function testSnap7Connection() {
    console.log('=== Snap7 Connection Test ===');
    
    const client = new snap7.S7Client();
    
    // Test configurations to try
    const testConfigs = [
        { ip: '192.168.1.100', rack: 0, slot: 2, description: 'Default PLC Config' },
        { ip: '192.168.1.1', rack: 0, slot: 2, description: 'Alternative PLC Config' },
        { ip: '127.0.0.1', rack: 0, slot: 2, description: 'Localhost (if simulator running)' },
        { ip: '10.0.0.100', rack: 0, slot: 2, description: 'Alternative Network Range' }
    ];
    
    for (const config of testConfigs) {
        console.log(`\nTesting ${config.description}: ${config.ip}:${config.rack}:${config.slot}`);
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout (5 seconds)'));
                }, 5000);
                
                client.ConnectTo(config.ip, config.rack, config.slot, (err) => {
                    clearTimeout(timeout);
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            console.log(`✅ SUCCESS: Connected to ${config.ip}`);
            
            // Test basic connectivity
            try {
                const cpuInfo = await new Promise((resolve, reject) => {
                    client.GetCpuInfo((err, info) => {
                        if (err) reject(err);
                        else resolve(info);
                    });
                });
                console.log('   CPU Info:', cpuInfo);
            } catch (infoErr) {
                console.log('   ⚠️  Connected but cannot get CPU info:', infoErr.message);
            }
            
            // Disconnect
            await new Promise((resolve) => {
                client.Disconnect((err) => {
                    if (err) console.log('   Disconnect warning:', err.message);
                    resolve();
                });
            });
            
            console.log(`✅ Configuration working: ${config.description}`);
            return config; // Return the working configuration
            
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
    
    console.log('\n❌ No working PLC configuration found.');
    console.log('\n📋 Possible solutions:');
    console.log('1. Install and run a Siemens PLC simulator (PLCSIM)');
    console.log('2. Configure a real Siemens PLC on your network');
    console.log('3. Use a software PLC emulator');
    console.log('4. Check network connectivity and firewall settings');
    
    return null;
}

// Run the test
testSnap7Connection().then((workingConfig) => {
    if (workingConfig) {
        console.log(`\n🎉 Use this configuration in your SCADA system:`);
        console.log(`   IP: ${workingConfig.ip}`);
        console.log(`   Rack: ${workingConfig.rack}`);
        console.log(`   Slot: ${workingConfig.slot}`);
    }
    process.exit(0);
}).catch((err) => {
    console.error('Test script error:', err);
    process.exit(1);
});
