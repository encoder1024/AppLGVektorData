import db from "../config/db.js";
import plcManager from "./plcManager.js";
import si from "systeminformation";

const HEALTH_INTERVAL_MS = Number(
  import.meta.env.SYSTEM_HEALTH_INTERVAL_MS || 30000,
);

const getFreshnessWindowMs = (scanRateMs) =>
  Math.max((scanRateMs || 1000) * 5, 60000);

const getStatusFromRows = (statuses, fallback = "red") => {
  if (statuses.length === 0) {
    return fallback;
  }
  if (statuses.includes("red")) {
    return "red";
  }
  if (statuses.includes("yellow")) {
    return "yellow";
  }
  return "green";
};

class SystemHealthService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
  }

  async start() {
    await this.runSnapshotCycle();

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.runSnapshotCycle().catch((error) => {
        console.error(
          "SystemHealthService: fallo en ciclo programado:",
          error.message,
        );
      });
    }, HEALTH_INTERVAL_MS);

    console.log(
      `SystemHealthService: housekeeping iniciado (${HEALTH_INTERVAL_MS}ms).`,
    );
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runSnapshotCycle() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const snapshotTime = new Date();
      const [
        plcs,
        sensors,
        actuators,
        latestSensorReadings,
        latestActuatorActions,
        serverSnapshot,
      ] = await Promise.all([
        db("plcs").select("*").orderBy("id", "asc"),
        db("sensors").select("*").orderBy("id", "asc"),
        db("actuators as a")
          .select("a.*", "p.nombre as plc_nombre")
          .leftJoin("plcs as p", "a.plc_id", "p.id")
          .orderBy("a.id", "asc"),
        this.getLatestSensorReadings(),
        this.getLatestActuatorActions(),
        this.buildServerSnapshot(snapshotTime),
      ]);

      const latestSensorById = new Map(
        latestSensorReadings.map((row) => [row.sensor_id, row]),
      );
      const latestActuatorById = new Map(
        latestActuatorActions.map((row) => [row.actuator_id, row]),
      );

      const sensorSnapshots = sensors.map((sensor) =>
        this.buildSensorSnapshot(
          sensor,
          latestSensorById.get(sensor.id),
          plcs,
          snapshotTime,
        ),
      );
      const actuatorSnapshots = actuators.map((actuator) =>
        this.buildActuatorSnapshot(
          actuator,
          latestActuatorById.get(actuator.id),
          plcs,
          snapshotTime,
        ),
      );
      const plcSnapshots = plcs.map((plc) =>
        this.buildPlcSnapshot(
          plc,
          sensors.filter((sensor) => sensor.plc_id === plc.id),
          actuators.filter((actuator) => actuator.plc_id === plc.id),
          latestSensorById,
          latestActuatorById,
          snapshotTime,
        ),
      );

      const snapshotRows = [
        ...plcSnapshots,
        ...sensorSnapshots,
        ...actuatorSnapshots,
      ];
      if (serverSnapshot) {
        snapshotRows.push(serverSnapshot);
      }

      if (snapshotRows.length > 0) {
        await db("system_health_snapshots").insert(snapshotRows);
      }
    } finally {
      this.isRunning = false;
    }
  }

  async buildServerSnapshot(snapshotTime) {
    try {
      const [cpu, mem, fs, os] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.osInfo(),
      ]);

      let dbStatus = "green";
      let dbLatency = 0;
      const start = Date.now();
      try {
        await db.raw("SELECT 1");
        dbLatency = Date.now() - start;
      } catch (e) {
        dbStatus = "red";
      }

      const mainFs = fs[0] || { use: 0, size: 0, used: 0 };
      const cpuLoad = cpu.currentLoad;
      const memUsedPercent = (mem.active / mem.total) * 100;
      const diskUsedPercent = mainFs.use;

      let status = "green";
      if (dbStatus === "red" || cpuLoad > 95 || memUsedPercent > 95) {
        status = "red";
      } else if (cpuLoad > 80 || memUsedPercent > 80 || diskUsedPercent > 90) {
        status = "yellow";
      }

      return {
        snapshot_time: snapshotTime,
        component_type: "SERVER",
        component_id: 1,
        component_name: os.hostname || "PC-SISTEMA",
        zone: "SISTEMAS",
        parent_plc_id: null,
        status,
        is_available: true,
        communication_state: "CONNECTED",
        latency_ms: dbLatency,
        last_response_at: snapshotTime,
        timeout_count: 0,
        error_count: 0,
        metadata: {
          cpu_load: cpuLoad.toFixed(2),
          mem_used_percent: memUsedPercent.toFixed(2),
          mem_used_gb: (mem.active / 1024 / 1024 / 1024).toFixed(2),
          mem_total_gb: (mem.total / 1024 / 1024 / 1024).toFixed(2),
          disk_used_percent: diskUsedPercent.toFixed(2),
          disk_used_gb: (mainFs.used / 1024 / 1024 / 1024).toFixed(2),
          disk_total_gb: (mainFs.size / 1024 / 1024 / 1024).toFixed(2),
          uptime: si.time().uptime,
          os_platform: os.platform,
          os_distro: os.distro,
          db_status: dbStatus,
          db_latency_ms: dbLatency,
        },
      };
    } catch (error) {
      console.error(
        "SystemHealthService: error al construir snapshot de servidor:",
        error.message,
      );
      return null;
    }
  }

  async getLatestSensorReadings() {
    const latestReadingTimes = db("sensor_readings")
      .select("sensor_id")
      .max("time as max_time")
      .groupBy("sensor_id")
      .as("latest_readings");

    return db("sensor_readings as sr")
      .select("sr.sensor_id", "sr.time", "sr.valor_procesado", "sr.valor_crudo")
      .join(latestReadingTimes, function joinLatestReadings() {
        this.on("sr.sensor_id", "=", "latest_readings.sensor_id").andOn(
          "sr.time",
          "=",
          "latest_readings.max_time",
        );
      });
  }

  async getLatestActuatorActions() {
    const latestActionTimes = db("actuator_actions")
      .select("actuator_id")
      .max("timestamp as max_time")
      .groupBy("actuator_id")
      .as("latest_actions");

    return db("actuator_actions as aa")
      .select("aa.actuator_id", "aa.timestamp", "aa.action_type", "aa.details")
      .join(latestActionTimes, function joinLatestActions() {
        this.on("aa.actuator_id", "=", "latest_actions.actuator_id").andOn(
          "aa.timestamp",
          "=",
          "latest_actions.max_time",
        );
      });
  }

  buildPlcSnapshot(
    plc,
    plcSensors,
    plcActuators,
    latestSensorById,
    latestActuatorById,
    snapshotTime,
  ) {
    const connected = plcManager.isConnected(plc.id);
    const sensorResponseTimes = plcSensors
      .map((sensor) => latestSensorById.get(sensor.id)?.time)
      .filter(Boolean)
      .map((value) => new Date(value));
    const actuatorResponseTimes = plcActuators
      .map((actuator) => latestActuatorById.get(actuator.id)?.timestamp)
      .filter(Boolean)
      .map((value) => new Date(value));
    const allResponseTimes = [...sensorResponseTimes, ...actuatorResponseTimes];
    const latestResponseDate =
      allResponseTimes.length > 0
        ? new Date(Math.max(...allResponseTimes.map((date) => date.getTime())))
        : null;
    const responseAgeMs = latestResponseDate
      ? snapshotTime.getTime() - latestResponseDate.getTime()
      : null;
    const freshnessWindowMs = getFreshnessWindowMs(plc.scan_rate_ms);

    let status = "red";
    let communicationState = "DISCONNECTED";
    let isAvailable = false;

    if (!plc.activo) {
      communicationState = "INACTIVE";
    } else if (!connected) {
      communicationState = "DISCONNECTED";
    } else if (!latestResponseDate) {
      status = "yellow";
      communicationState = "CONNECTED_NO_DATA";
      isAvailable = true;
    } else if (responseAgeMs <= freshnessWindowMs) {
      status = "green";
      communicationState = "CONNECTED";
      isAvailable = true;
    } else {
      status = "yellow";
      communicationState = "STALE";
      isAvailable = true;
    }

    return {
      snapshot_time: snapshotTime,
      component_type: "PLC",
      component_id: plc.id,
      component_name: plc.nombre,
      zone: plc.zona || null,
      parent_plc_id: null,
      status,
      is_available: isAvailable,
      communication_state: communicationState,
      latency_ms: responseAgeMs,
      last_response_at: latestResponseDate || null,
      timeout_count: responseAgeMs && responseAgeMs > freshnessWindowMs ? 1 : 0,
      error_count: 0,
      metadata: {
        protocol: plc.protocolo,
        ip_address: plc.ip_address,
        puerto: plc.puerto,
        scan_rate_ms: plc.scan_rate_ms,
        connected,
        sensor_count: plcSensors.length,
        actuator_count: plcActuators.length,
      },
    };
  }

  buildSensorSnapshot(sensor, latestReading, plcs, snapshotTime) {
    const plc = plcs.find((item) => item.id === sensor.plc_id);
    const plcConnected = sensor.plc_id
      ? plcManager.isConnected(sensor.plc_id)
      : false;
    const lastResponseDate = latestReading?.time
      ? new Date(latestReading.time)
      : null;
    const responseAgeMs = lastResponseDate
      ? snapshotTime.getTime() - lastResponseDate.getTime()
      : null;
    const freshnessWindowMs = getFreshnessWindowMs(plc?.scan_rate_ms);

    let status = "red";
    let communicationState = "NO_DATA";
    let isAvailable = false;

    if (!sensor.activo) {
      communicationState = "INACTIVE";
    } else if (!plcConnected) {
      communicationState = "PLC_DISCONNECTED";
    } else if (!lastResponseDate) {
      status = "yellow";
      communicationState = "CONNECTED_NO_DATA";
      isAvailable = true;
    } else if (responseAgeMs <= freshnessWindowMs) {
      status = "green";
      communicationState = "CONNECTED";
      isAvailable = true;
    } else {
      status = "yellow";
      communicationState = "STALE";
      isAvailable = true;
    }

    return {
      snapshot_time: snapshotTime,
      component_type: "SENSOR",
      component_id: sensor.id,
      component_name: sensor.tag_name,
      zone: sensor.zona || null,
      parent_plc_id: sensor.plc_id || null,
      status,
      is_available: isAvailable,
      communication_state: communicationState,
      latency_ms: responseAgeMs,
      last_response_at: lastResponseDate || null,
      timeout_count: responseAgeMs && responseAgeMs > freshnessWindowMs ? 1 : 0,
      error_count: 0,
      metadata: {
        plc_nombre: plc?.nombre || null,
        unidad_medida: sensor.unidad_medida || null,
        direccion_memoria: sensor.direccion_memoria || null,
        valor_procesado: latestReading?.valor_procesado ?? null,
        valor_crudo: latestReading?.valor_crudo ?? null,
      },
    };
  }

  buildActuatorSnapshot(actuator, latestAction, plcs, snapshotTime) {
    const plc = plcs.find((item) => item.id === actuator.plc_id);
    const plcConnected = actuator.plc_id
      ? plcManager.isConnected(actuator.plc_id)
      : false;
    const lastResponseDate = latestAction?.timestamp
      ? new Date(latestAction.timestamp)
      : null;
    const responseAgeMs = lastResponseDate
      ? snapshotTime.getTime() - lastResponseDate.getTime()
      : null;

    let status = "red";
    let communicationState = "UNAVAILABLE";
    let isAvailable = false;

    if (!actuator.activo) {
      communicationState = "INACTIVE";
    } else if (!plcConnected) {
      communicationState = "PLC_DISCONNECTED";
    } else if (!lastResponseDate) {
      status = "yellow";
      communicationState = "CONNECTED_NO_ACTION";
      isAvailable = true;
    } else {
      status = "green";
      communicationState = "CONNECTED";
      isAvailable = true;
    }

    return {
      snapshot_time: snapshotTime,
      component_type: "ACTUATOR",
      component_id: actuator.id,
      component_name: actuator.nombre,
      zone: actuator.zona || null,
      parent_plc_id: actuator.plc_id || null,
      status,
      is_available: isAvailable,
      communication_state: communicationState,
      latency_ms: responseAgeMs,
      last_response_at: lastResponseDate || null,
      timeout_count: 0,
      error_count: 0,
      metadata: {
        plc_nombre: plc?.nombre || actuator.plc_nombre || null,
        tipo_ui: actuator.tipo_ui || null,
        tipo_signal: actuator.tipo_signal || null,
        direccion_memoria: actuator.direccion_memoria || null,
        last_action_type: latestAction?.action_type || null,
        details: latestAction?.details || null,
      },
    };
  }

  async getLatestSnapshotSummary() {
    const latestSnapshotRow = await db("system_health_snapshots")
      .select("snapshot_time")
      .orderBy("snapshot_time", "desc")
      .first();

    if (!latestSnapshotRow) {
      return {
        snapshot_time: null,
        snapshots: [],
        summary: {
          total: 0,
          green: 0,
          yellow: 0,
          red: 0,
          overall_status: "yellow",
        },
      };
    }

    const snapshots = await db("system_health_snapshots")
      .select("*")
      .where({ snapshot_time: latestSnapshotRow.snapshot_time })
      .orderBy([
        { column: "component_type", order: "asc" },
        { column: "component_name", order: "asc" },
      ]);

    return {
      snapshot_time: new Date(latestSnapshotRow.snapshot_time).toISOString(),
      snapshots,
      summary: {
        total: snapshots.length,
        green: snapshots.filter((item) => item.status === "green").length,
        yellow: snapshots.filter((item) => item.status === "yellow").length,
        red: snapshots.filter((item) => item.status === "red").length,
        overall_status: getStatusFromRows(
          snapshots.map((item) => item.status),
          "yellow",
        ),
      },
    };
  }
}

export default new SystemHealthService();
