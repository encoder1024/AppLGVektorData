import Modbus from 'jsmodbus';
import net from 'net';

const netServer = new net.Server();
const holdingRegisters = Buffer.alloc(1000);
const coils = Buffer.alloc(64);

new Modbus.server.TCP(netServer, {
  holdingRegisters,
  coils
});

const readCoil = (address) => {
  const byteIndex = Math.floor(address / 8);
  const bitIndex = address % 8;
  return ((coils[byteIndex] >> bitIndex) & 1) === 1;
};

const writeCoil = (address, value) => {
  const byteIndex = Math.floor(address / 8);
  const bitIndex = address % 8;
  if (value) {
    coils[byteIndex] |= 1 << bitIndex;
  } else {
    coils[byteIndex] &= ~(1 << bitIndex);
  }
};

setInterval(() => {
  for (let i = 0; i < 10; i += 1) {
    const time = Date.now() / 5000;
    const value = Math.floor(50 + 30 * Math.sin(time + i));
    holdingRegisters.writeUInt16BE(value, i * 2);
  }
}, 1000);

setInterval(() => {
  const states = [0, 1, 2, 3].map((address) => `${address}:${readCoil(address) ? 'ON' : 'OFF'}`);
  console.log(`Coils digitales -> ${states.join(' | ')}`);
}, 5000);

netServer.listen(5020, () => {
  writeCoil(0, false);
  writeCoil(1, false);
  writeCoil(2, false);
  writeCoil(3, false);

  console.log('SIMULADOR MODBUS TCP ACTIVO en puerto 5020');
  console.log('Holding registers 0 al 9 simulando sensores (0-100)');
  console.log('Coils 0 al 3 listas para actuadores digitales on/off');
});
