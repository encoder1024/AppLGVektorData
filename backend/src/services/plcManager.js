import Modbus from 'jsmodbus';
import nodes7 from 'nodes7';
import net from 'net';
import db from '../config/db.js';
import { applyCalibration } from './calibrationService.js';

class PLCManager {
  constructor() {
    this.connections = new Map(); 
    this.io = null; 
  }

  setIO(io) { this.io = io; }

  async initAll() {
    try {
      const plcs = await db('plcs').where({ activo: true });
      console.log(`📡 PLCManager: Inicializando ${plcs.length} conexiones activas...`);
      for (const plc of plcs) {
        await this.connect(plc);
      }
    } catch (error) {
      console.error('❌ PLCManager Init Error:', error);
    }
  }

  async disconnect(plcId) {
    const conn = this.connections.get(plcId);
    if (conn) {
      if (conn.interval) {
        clearInterval(conn.interval);
        console.log(`⏱️ PLCManager: Intervalo de polling detenido para PLC ID ${plcId}`);
      }
      if (conn.socket) conn.socket.destroy();
      this.connections.delete(plcId);
      console.log(`🔌 PLCManager: Conexión eliminada para PLC ID ${plcId}`);
    }
  }

  async connect(plc) {
    // Si ya existe, desconectamos primero para refrescar configuración
    await this.disconnect(plc.id);

    console.log(`🔌 PLCManager: Intentando conectar a ${plc.nombre} [${plc.protocolo}]`);

    // MODBUS TCP
    if (plc.protocolo === 'MODBUS_TCP') {
      const socket = new net.Socket();
      const client = new Modbus.client.TCP(socket, plc.unidad_id || 1);
      
      socket.on('connect', () => {
        console.log(`✅ Modbus Conectado: ${plc.nombre} (${plc.ip_address}:${plc.puerto})`);
        this.connections.set(plc.id, { client, protocol: 'MODBUS_TCP', socket });
        this.startPolling(plc.id);
      });

      socket.on('error', (err) => {
        console.error(`❌ Error Red PLC ${plc.nombre}:`, err.message);
        this.disconnect(plc.id);
      });

      socket.connect({ host: plc.ip_address, port: parseInt(plc.puerto) || 502 });
    } 
    
    // SIEMENS S7
    else if (plc.protocolo === 'S7') {
      const s7Client = new nodes7();
      s7Client.initiateConnection(
        { host: plc.ip_address, port: parseInt(plc.puerto) || 102, rack: 0, slot: 1 },
        (err) => {
          if (err) {
            console.error(`❌ Error S7 ${plc.nombre}:`, err);
          } else {
            console.log(`✅ S7 Conectado: ${plc.nombre} (${plc.ip_address})`);
            this.connections.set(plc.id, { client: s7Client, protocol: 'S7' });
            this.startPolling(plc.id);
          }
        }
      );
    }

    // SIMULADO
    else if (plc.protocolo === 'SIMULATED') {
      console.log(`🧪 Iniciando PLC VIRTUAL: ${plc.nombre}`);
      this.connections.set(plc.id, { protocol: 'SIMULATED' });
      this.startPolling(plc.id);
    }
  }

  async startPolling(plcId) {
    const plc = await db('plcs').where({ id: plcId }).first();
    if (!plc) return;

    console.log(`⏱️ Iniciando Ciclo de Polling: ${plc.nombre} (${plc.scan_rate_ms}ms)`);

    const interval = setInterval(async () => {
      const conn = this.connections.get(plcId);
      if (!conn) {
        clearInterval(interval);
        return;
      }

      try {
        const sensors = await db('sensors as s')
          .select('s.*', 'c.tipo_formula', 'c.c0', 'c.c1', 'c.c2', 'c.c3', 'c.c4')
          .leftJoin('calibration_profiles as c', 's.calibration_profile_id', 'c.id')
          .where({ 's.plc_id': plcId, 's.activo': true });

        // LOG de debug si no hay sensores
        if (sensors.length === 0 && Math.random() > 0.9) {
          console.log(`ℹ️ Polling ${plc.nombre}: Sin sensores activos configurados.`);
        }

        for (const sensor of sensors) {
          let rawValue = 0;

          if (conn.protocol === 'MODBUS_TCP') {
            const addr = parseInt(sensor.direccion_memoria);
            const data = await conn.client.readHoldingRegisters(addr, 1);
            rawValue = data.response._body.values[0];
          } 
          else if (conn.protocol === 'SIMULATED') {
            const time = Date.now() / 10000;
            const offset = sensor.id * 10;
            rawValue = Math.floor(500 + 400 * Math.sin(time + offset));
          }

          const processedValue = applyCalibration(rawValue, sensor);

          // Guardar en DB
          await db('sensor_readings').insert({
            time: new Date(),
            sensor_id: sensor.id,
            valor_procesado: processedValue,
            valor_crudo: rawValue
          });

          // Emitir a Frontend
          if (this.io) {
            this.io.emit('sensor_update', {
              sensor_id: sensor.id,
              tag_name: sensor.tag_name,
              value: processedValue,
              unit: sensor.unidad_medida,
              time: new Date()
            });
          }
        }
      } catch (err) {
        console.error(`⚠️ Polling Error ${plc.nombre}:`, err.message);
      }
    }, plc.scan_rate_ms || 1000);

    // Guardar referencia del intervalo para poder detenerlo
    const currentConn = this.connections.get(plcId);
    if (currentConn) currentConn.interval = interval;
  }
}

export default new PLCManager();
