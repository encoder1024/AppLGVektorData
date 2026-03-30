import Modbus from 'jsmodbus';
import net from 'net';

const netServer = new net.Server();
const holdingRegisters = Buffer.alloc(1000); // 500 registros de 16 bits
const server = new Modbus.server.TCP(netServer, {
  holdingRegisters: holdingRegisters
});

// Función para simular movimiento de sensores
setInterval(() => {
  for (let i = 0; i < 10; i++) {
    // Generamos un valor senoidal para que los gráficos se vean bien
    const time = Date.now() / 5000;
    const value = Math.floor(50 + 30 * Math.sin(time + i));
    
    // Escribimos en el registro (Dirección 0, 1, 2...)
    holdingRegisters.writeUInt16BE(value, i * 2);
  }
}, 1000);

netServer.listen(5020, () => {
  console.log('🚀 SIMULADOR MODBUS TCP ACTIVO en puerto 5020');
  console.log('--- Registros 0 al 9 simulando sensores (0-100) ---');
});
