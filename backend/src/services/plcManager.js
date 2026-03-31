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

  setIO(io) {
    this.io = io;
  }

  emitSensorUpdate(sensor, value) {
    if (!this.io) {
      return;
    }

    this.io.emit('sensor_update', {
      sensor_id: sensor.id,
      tag_name: sensor.tag_name,
      value,
      unit: sensor.unidad_medida,
      time: new Date()
    });
  }

  emitActuatorUpdate(actuator, value) {
    if (!this.io) {
      return;
    }

    this.io.emit('actuator_update', {
      actuator_id: actuator.id,
      plc_id: actuator.plc_id,
      nombre: actuator.nombre,
      tipo_ui: actuator.tipo_ui,
      state: Boolean(value),
      value,
      time: new Date()
    });
  }

  async initAll() {
    try {
      const plcs = await db('plcs').where({ activo: true });
      console.log(`PLCManager: Inicializando ${plcs.length} conexiones activas...`);
      for (const plc of plcs) {
        try {
          await this.connect(plc);
        } catch (error) {
          console.error(`PLCManager: No se pudo conectar ${plc.nombre}:`, error.message);
        }
      }
    } catch (error) {
      console.error('PLCManager Init Error:', error);
    }
  }

  async disconnect(plcId) {
    const conn = this.connections.get(plcId);
    if (!conn) {
      return;
    }

    if (conn.interval) {
      clearInterval(conn.interval);
      console.log(`PLCManager: Intervalo de polling detenido para PLC ID ${plcId}`);
    }

    if (conn.socket) {
      conn.socket.destroy();
    }

    if (conn.protocol === 'S7' && conn.client?.dropConnection) {
      try {
        conn.client.dropConnection();
      } catch (error) {
        console.error(`PLCManager: Error cerrando conexion S7 ${plcId}:`, error.message);
      }
    }

    this.connections.delete(plcId);
    console.log(`PLCManager: Conexion eliminada para PLC ID ${plcId}`);
  }

  async connect(plc) {
    await this.disconnect(plc.id);

    console.log(`PLCManager: Intentando conectar a ${plc.nombre} [${plc.protocolo}]`);

    if (plc.protocolo === 'MODBUS_TCP') {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const client = new Modbus.client.TCP(socket, plc.unidad_id || 1);
        let settled = false;

        const fail = (error) => {
          if (settled) {
            return;
          }
          settled = true;
          socket.destroy();
          reject(error);
        };

        socket.once('connect', () => {
          if (settled) {
            return;
          }
          settled = true;
          console.log(`Modbus conectado: ${plc.nombre} (${plc.ip_address}:${plc.puerto})`);
          this.connections.set(plc.id, { client, protocol: 'MODBUS_TCP', socket });
          this.startPolling(plc.id);
          resolve();
        });

        socket.once('error', (err) => {
          console.error(`Error de red PLC ${plc.nombre}:`, err.message);
          fail(err);
        });

        socket.connect({ host: plc.ip_address, port: parseInt(plc.puerto, 10) || 502 });
      });
      return;
    }

    if (plc.protocolo === 'S7') {
      await new Promise((resolve, reject) => {
        const s7Client = new nodes7();
        s7Client.initiateConnection(
          { host: plc.ip_address, port: parseInt(plc.puerto, 10) || 102, rack: 0, slot: 1 },
          (err) => {
            if (err) {
              console.error(`Error S7 ${plc.nombre}:`, err);
              reject(err);
              return;
            }

            console.log(`S7 conectado: ${plc.nombre} (${plc.ip_address})`);
            this.connections.set(plc.id, { client: s7Client, protocol: 'S7' });
            this.startPolling(plc.id);
            resolve();
          }
        );
      });
      return;
    }

    if (plc.protocolo === 'SIMULATED') {
      console.log(`Iniciando PLC virtual: ${plc.nombre}`);
      this.connections.set(plc.id, { protocol: 'SIMULATED', simulatedActuatorStates: new Map() });
      this.startPolling(plc.id);
      return;
    }

    throw new Error(`Protocolo no soportado: ${plc.protocolo}`);
  }

  async ensureConnection(plcId) {
    const currentConnection = this.connections.get(plcId);
    if (currentConnection) {
      return currentConnection;
    }

    const plc = await db('plcs').where({ id: plcId }).first();
    if (!plc) {
      throw new Error('PLC no encontrado para este actuador');
    }
    if (!plc.activo) {
      throw new Error('PLC inactivo para este actuador');
    }

    await this.connect(plc);
    const connected = this.connections.get(plcId);
    if (!connected) {
      throw new Error(`No se pudo establecer conexion con el PLC ${plc.nombre}`);
    }

    return connected;
  }

  async writeActuator(actuator, value) {
    const conn = await this.ensureConnection(actuator.plc_id);
    const isBooleanOutput =
      actuator.tipo_dato_plc === 'BOOLEAN' ||
      actuator.tipo_signal === 'DIGITAL_OUTPUT';

    if (conn.protocol === 'MODBUS_TCP') {
      const address = parseInt(actuator.direccion_memoria, 10);
      if (Number.isNaN(address)) {
        throw new Error('Direccion de memoria invalida para el actuador');
      }

      if (isBooleanOutput) {
        await conn.client.writeSingleCoil(address, Boolean(value));
      } else {
        await conn.client.writeSingleRegister(address, Number(value));
      }
    } else if (conn.protocol === 'S7') {
      await new Promise((resolve, reject) => {
        conn.client.writeItems(
          actuator.direccion_memoria,
          isBooleanOutput ? Boolean(value) : Number(value),
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }
        );
      });
    } else if (conn.protocol === 'SIMULATED') {
      conn.simulatedActuatorStates?.set(actuator.id, value);
    } else {
      throw new Error(`Escritura no soportada para protocolo ${conn.protocol}`);
    }

    this.emitActuatorUpdate(actuator, value);
    return value;
  }

  async startPolling(plcId) {
    const plc = await db('plcs').where({ id: plcId }).first();
    if (!plc) {
      return;
    }

    console.log(`Iniciando ciclo de polling: ${plc.nombre} (${plc.scan_rate_ms}ms)`);

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

        if (sensors.length === 0 && Math.random() > 0.9) {
          console.log(`Polling ${plc.nombre}: sin sensores activos configurados.`);
        }

        for (const sensor of sensors) {
          let rawValue = 0;

          if (conn.protocol === 'MODBUS_TCP') {
            const address = parseInt(sensor.direccion_memoria, 10);
            const data = await conn.client.readHoldingRegisters(address, 1);
            rawValue = data.response._body.values[0];
          } else if (conn.protocol === 'SIMULATED') {
            const time = Date.now() / 10000;
            const offset = sensor.id * 10;
            rawValue = Math.floor(500 + 400 * Math.sin(time + offset));
          }

          const processedValue = applyCalibration(rawValue, sensor);

          await db('sensor_readings').insert({
            time: new Date(),
            sensor_id: sensor.id,
            valor_procesado: processedValue,
            valor_crudo: rawValue
          });

          this.emitSensorUpdate(sensor, processedValue);
        }
      } catch (err) {
        console.error(`Polling error ${plc.nombre}:`, err.message);
      }
    }, plc.scan_rate_ms || 1000);

    const currentConn = this.connections.get(plcId);
    if (currentConn) {
      currentConn.interval = interval;
    }
  }
}

export default new PLCManager();
