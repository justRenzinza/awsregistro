// test-postgres.js
// Execute: node test-postgres.js

const net = require('net');

const HOST = '10.27.0.53';
const PORT = 5434;

console.log(`🔍 Testando conexão com PostgreSQL em ${HOST}:${PORT}...`);

const socket = new net.Socket();
const timeout = 10000; // 5 segundos

socket.setTimeout(timeout);

socket.connect(PORT, HOST, () => {
    console.log('✅ Conexão estabelecida com sucesso!');
    socket.destroy();
});

socket.on('timeout', () => {
    console.error('❌ Timeout: não foi possível conectar em 10 segundos');
    socket.destroy();
});

socket.on('error', (err) => {
    console.error('❌ Erro de conexão:', err.message);
    socket.destroy();
});

socket.on('close', () => {
    console.log('🔌 Conexão fechada');
});