import ping from 'ping';
import Modbus from 'jsmodbus';
import net from 'net';
import db from '../config/db.js';

class NetworkMonitor {
  constructor() {
    this.io = null;
    this.nodes = []; // Lista de nodos (PLCs y Switches) a monitorear
    this.interval = null;
    this.checkIntervalMs = 15000; // Cada 15 segundos para no saturar
  }

  setIO(io) {
    this.io = io;
  }

  /**
   * Inicializa la lista de nodos a monitorear desde la DB
   */
  async init() {
    try {
      // 1. Cargamos los PLCs activos
      const plcs = await db('plcs').where('activo', true).select('id', 'nombre', 'ip_address', 'puerto');
      const plcNodes = plcs.map(plc => ({
        id: `plc-${plc.id}`,
        db_id: plc.id,
        tag_name: plc.nombre,
        ip: plc.ip_address,
        port: plc.puerto || 502,
        type: 'PLC'
      }));

      // 2. Cargamos los nodos de infraestructura (Switches, Servidores, etc.)
      const infraNodesFromDb = await db('infrastructure_nodes').where('activo', true).select('id', 'nombre', 'ip_address', 'tipo');
      const infraNodes = infraNodesFromDb.map(node => ({
        id: `infra-${node.id}`,
        db_id: node.id,
        tag_name: node.nombre,
        ip: node.ip_address,
        port: null,
        type: node.tipo // SWITCH, SERVER, etc.
      }));

      this.nodes = [...plcNodes, ...infraNodes];

      console.log(`[NetworkMonitor] Inicializado con ${plcNodes.length} PLCs y ${infraNodes.length} nodos de infraestructura.`);
    } catch (err) {
      console.error('[NetworkMonitor] Error al inicializar nodos desde la DB:', err.message);
    }
  }

  /**
   * Ejecuta el ciclo de monitoreo
   */
  async start() {
    await this.init(); // Carga inicial
    
    if (this.interval) clearInterval(this.interval);
    
    this.interval = setInterval(async () => {
      await this.runCheck();
    }, this.checkIntervalMs);
    
    console.log(`[NetworkMonitor] Motor de monitoreo iniciado (Intervalo: ${this.checkIntervalMs}ms).`);
  }

  async runCheck() {
    if (this.nodes.length === 0) {
      await this.init();
    }

    const results = await Promise.all(this.nodes.map(node => this.checkNode(node)));
    
    // Persistimos en DB usando el nuevo esquema (node_type y target_id)
    if (results.length > 0) {
      try {
        const logs = results.map(r => {
          // r.id es 'plc-1' o 'infra-2', lo separamos
          const [prefix, idStr] = r.id.split('-');
          return {
            time: r.last_check,
            node_type: prefix === 'plc' ? 'PLC' : 'INFRA',
            target_id: parseInt(idStr),
            status: r.status,
            latency: r.latency,
            ip: r.ip
          };
        });
        await db('network_health_logs').insert(logs);
      } catch (err) {
        console.error('[NetworkMonitor] Error al persistir logs de red:', err.message);
      }
    }

    if (this.io) {
      console.log(`[NetworkMonitor] Emitiendo actualización de red para ${results.length} nodos.`);
      this.io.emit('network_status_update', results);
    }
    
    return results;
  }

  async checkNode(node) {
    const { id, ip, type, tag_name, port } = node;
    let status = 'DOWN';
    let latency = null;

    try {
      // 1. Siempre hacemos PING (ICMP)
      const res = await ping.promise.probe(ip, {
        timeout: 2,
        extra: ['-c', '1'] // Cambiado a -c para Linux (Docker corre en Linux)
      });
      
      status = res.alive ? 'UP' : 'DOWN';
      latency = res.time !== 'unknown' ? parseFloat(res.time) : null;

      // 2. Si es PLC y está UP a nivel IP, probamos el puerto de aplicación (Modbus/S7/etc)
      if (status === 'UP' && type === 'PLC') {
        const portAlive = await this.checkPort(ip, port);
        if (!portAlive) {
          status = 'DEGRADED'; // IP responde pero el puerto del PLC no
        }
      }
    } catch (err) {
      status = 'ERROR';
    }

    return { id, tag_name, ip, type, status, latency, last_check: new Date().toISOString() };
  }

  /**
   * Verifica si un puerto TCP está abierto
   */
  checkPort(ip, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Fuerza la recarga de nodos desde la base de datos (Hot-reload)
   */
  async refresh() {
    console.log('[NetworkMonitor] Recargando configuración de nodos por solicitud externa...');
    await this.init();
    // Ejecutamos un chequeo inmediato tras la recarga para actualizar el dashboard
    await this.runCheck();
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    console.log('[NetworkMonitor] Motor de monitoreo detenido.');
  }
}

const networkMonitor = new NetworkMonitor();
export default networkMonitor;
