// snap7-simulator.js
// Mock Snap7 server to simulate PLC behavior for testing

const net = require('net');
const EventEmitter = require('events');

class MockS7Server extends EventEmitter {
    constructor(port = 102) {
        super();
        this.port = port;
        this.server = null;
        this.clients = new Set();
        
        // Simulated PLC data
        this.dataBlocks = {
            1: Buffer.alloc(100), // DB1 - Digital I/O
            2: Buffer.alloc(100), // DB2 - Analog values 
            3: Buffer.alloc(100), // DB3 - Solar data
            4: Buffer.alloc(100), // DB4 - Battery data
            5: Buffer.alloc(100)  // DB5 - Temperature data
        };
        
        // Initialize with some realistic data
        this.initializeData();
        
        // Start data simulation
        this.startDataSimulation();
    }
    
    initializeData() {
        // DB1 - Digital I/O (Booleans)
        this.dataBlocks[1][0] = 0x01; // PLC status = true
        
        // DB2 - Grid data (Floats at 4-byte intervals)
        this.writeFloat(2, 0, 230.5);   // Grid Voltage L1
        this.writeFloat(2, 4, 231.2);   // Grid Voltage L2  
        this.writeFloat(2, 8, 229.8);   // Grid Voltage L3
        this.writeFloat(2, 12, 15.5);   // Grid Current L1
        this.writeFloat(2, 16, 16.2);   // Grid Current L2
        this.writeFloat(2, 20, 15.8);   // Grid Current L3
        this.writeFloat(2, 24, 11.2);   // Total Active Power
        this.writeFloat(2, 28, 50.0);   // Grid Frequency
        
        // DB3 - Solar data
        this.writeFloat(3, 0, 450.0);   // Solar Voltage
        this.writeFloat(3, 4, 25.0);    // Solar Current
        this.writeFloat(3, 8, 11.25);   // Solar Power
        
        // DB4 - Battery data
        this.writeFloat(4, 0, 48.5);    // Battery Voltage
        this.writeFloat(4, 4, -5.5);    // Battery Current (charging)
        this.writeFloat(4, 8, 85.5);    // Battery SOC
        
        // DB5 - Temperature data
        this.writeFloat(5, 0, 45.5);    // Inverter Temperature
        this.writeFloat(5, 4, 28.5);    // Ambient Temperature
    }
    
    writeFloat(dbNum, offset, value) {
        if (this.dataBlocks[dbNum]) {
            this.dataBlocks[dbNum].writeFloatBE(value, offset);
        }
    }
    
    readFloat(dbNum, offset) {
        if (this.dataBlocks[dbNum]) {
            return this.dataBlocks[dbNum].readFloatBE(offset);
        }
        return 0;
    }
    
    startDataSimulation() {
        // Simulate changing values every 2 seconds
        setInterval(() => {
            // Vary grid voltages slightly
            this.writeFloat(2, 0, 230.5 + (Math.random() - 0.5) * 10);
            this.writeFloat(2, 4, 231.2 + (Math.random() - 0.5) * 10);
            this.writeFloat(2, 8, 229.8 + (Math.random() - 0.5) * 10);
            
            // Vary currents
            this.writeFloat(2, 12, 15.5 + (Math.random() - 0.5) * 5);
            this.writeFloat(2, 16, 16.2 + (Math.random() - 0.5) * 5);
            this.writeFloat(2, 20, 15.8 + (Math.random() - 0.5) * 5);
            
            // Vary solar data
            this.writeFloat(3, 0, 450 + (Math.random() - 0.5) * 50);
            this.writeFloat(3, 4, 25 + (Math.random() - 0.5) * 10);
            
            // Vary battery SOC slowly
            const currentSOC = this.readFloat(4, 8);
            this.writeFloat(4, 8, Math.max(0, Math.min(100, currentSOC + (Math.random() - 0.5) * 0.5)));
            
            // Vary temperatures
            this.writeFloat(5, 0, 45.5 + (Math.random() - 0.5) * 5);
            this.writeFloat(5, 4, 28.5 + (Math.random() - 0.5) * 3);
            
            console.log(`📊 Data updated - Grid: ${this.readFloat(2, 0).toFixed(1)}V, Solar: ${this.readFloat(3, 8).toFixed(1)}kW, Battery: ${this.readFloat(4, 8).toFixed(1)}%`);
        }, 2000);
    }
    
    start() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                console.log(`🔌 Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
                this.clients.add(socket);
                
                socket.on('data', (data) => {
                    // Simple S7 protocol simulation
                    console.log(`📥 Received ${data.length} bytes from client`);
                    
                    // Send acknowledgment (simplified)
                    const response = Buffer.from([0x32, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00]);
                    socket.write(response);
                });
                
                socket.on('close', () => {
                    console.log(`🔌 Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
                    this.clients.delete(socket);
                });
                
                socket.on('error', (err) => {
                    console.error(`❌ Socket error: ${err.message}`);
                    this.clients.delete(socket);
                });
            });
            
            this.server.listen(this.port, '0.0.0.0', () => {
                console.log(`🏭 Mock S7 PLC Server started on port ${this.port}`);
                console.log(`📡 Listening for connections on all interfaces`);
                console.log(`🔧 Configure your SCADA to connect to: 127.0.0.1 or localhost`);
                resolve();
            });
            
            this.server.on('error', reject);
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                // Close all client connections
                this.clients.forEach(client => client.destroy());
                this.clients.clear();
                
                this.server.close(() => {
                    console.log('🔌 Mock S7 PLC Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Start the mock server
const mockPLC = new MockS7Server();

mockPLC.start().then(() => {
    console.log('\n✅ Mock PLC is ready for connections!');
    console.log('\n📋 Next steps:');
    console.log('1. Keep this terminal running');
    console.log('2. In your browser, go to: http://localhost:3001/protocol-config');
    console.log('3. Select Snap7 tab');
    console.log('4. Set PLC IP to: 127.0.0.1 or localhost');
    console.log('5. Set Rack: 0, Slot: 2');
    console.log('6. Click Connect');
    console.log('\n🔄 The mock PLC will generate realistic changing data every 2 seconds');
}).catch((err) => {
    console.error('❌ Failed to start mock PLC:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down mock PLC...');
    await mockPLC.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await mockPLC.stop();
    process.exit(0);
});
