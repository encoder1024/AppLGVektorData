import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Boolean(value);
};

const getSensorTableColumns = async () => {
  const info = await db('sensors').columnInfo();
  return new Set(Object.keys(info));
};

const normalizeSensorPayload = async (payload) => {
  const columns = await getSensorTableColumns();

  const normalized = {
    plc_id: toNullableNumber(payload.plc_id),
    tag_name: payload.tag_name,
    tipo_signal: payload.tipo_signal,
    tipo_dato_plc: payload.tipo_dato_plc,
    direccion_memoria: payload.direccion_memoria,
    unidad_medida: payload.unidad_medida || null,
    calibration_profile_id: toNullableNumber(payload.calibration_profile_id),
    min_range: toNullableNumber(payload.min_range) ?? 0,
    max_range: toNullableNumber(payload.max_range) ?? 100,
    warning_low: toNullableNumber(payload.warning_low),
    warning_high: toNullableNumber(payload.warning_high),
    alert_low: toNullableNumber(payload.alert_low),
    alert_high: toNullableNumber(payload.alert_high),
    setpoint: toNullableNumber(payload.setpoint),
    activo: payload.activo === undefined ? true : toBoolean(payload.activo),
  };

  if (columns.has('tipo_instrumento') && payload.tipo_instrumento !== undefined) {
    normalized.tipo_instrumento = payload.tipo_instrumento;
  }

  if (columns.has('zona') && payload.zona !== undefined) {
    normalized.zona = payload.zona;
  }

  if (columns.has('orden_dashboard') && payload.orden_dashboard !== undefined) {
    normalized.orden_dashboard = toNullableNumber(payload.orden_dashboard) ?? 0;
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([key, value]) => columns.has(key) && value !== undefined)
  );
};

const getSensors = async (req, res) => {
  try {
    // Obtenemos sensores con información de su PLC y Perfil de Calibración asociada
    const sensors = await db('sensors as s')
      .select('s.*', 'p.nombre as plc_nombre', 'c.nombre as perfil_nombre')
      .leftJoin('plcs as p', 's.plc_id', 'p.id')
      .leftJoin('calibration_profiles as c', 's.calibration_profile_id', 'c.id')
      .orderBy('s.tag_name', 'asc');
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sensores', error: error.message });
  }
};

const getSensorReadings = async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;

  try {
    let query = db('sensor_readings as sr')
      .select(
        'sr.time',
        'sr.valor_procesado as value',
        'sr.valor_crudo as raw_value',
        's.unidad_medida as unit',
        's.tag_name'
      )
      .leftJoin('sensors as s', 'sr.sensor_id', 's.id')
      .where('sr.sensor_id', id);

    if (start && end) {
      query = query.whereBetween('sr.time', [start, end]);
    } else if (start) {
      query = query.where('sr.time', '>=', start);
    } else if (end) {
      query = query.where('sr.time', '<=', end);
    }

    const readings = await query.orderBy('sr.time', 'asc');
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener lecturas historicas del sensor', error: error.message });
  }
};

const createSensor = async (req, res) => {
  try {
    const payload = await normalizeSensorPayload(req.body);
    const [newSensor] = await db('sensors').insert(payload).returning('*');

    await logAudit(
      req.user.id,
      'SENSOR_CREATE',
      newSensor.id,
      `Se configuró el sensor: ${newSensor.tag_name} en PLC ID: ${newSensor.plc_id}`,
      null,
      newSensor,
      req.ip
    );

    res.status(201).json(newSensor);
  } catch (error) {
    console.error('Error en createSensor:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un sensor con ese TAG_NAME dentro del PLC seleccionado.' });
    }
    res.status(500).json({ message: 'Error al crear sensor', error: error.message });
  }
};

const updateSensor = async (req, res) => {
  const { id } = req.params;
  const updates = await normalizeSensorPayload(req.body);

  // Eliminar campos que vienen del JOIN y no existen en la tabla física
  delete updates.id;
  delete updates.plc_nombre;
  delete updates.perfil_nombre;
  delete updates.created_at;

  try {
    const oldSensor = await db('sensors').where({ id }).first();
    if (!oldSensor) return res.status(404).json({ message: 'Sensor no encontrado' });

    const [updatedSensor] = await db('sensors').where({ id }).update(updates).returning('*');

    await logAudit(
      req.user.id,
      'SENSOR_UPDATE',
      id,
      `Se actualizó la "Caja de Ajustes" del sensor: ${oldSensor.tag_name}`,
      oldSensor,
      updatedSensor,
      req.ip
    );

    res.json(updatedSensor);
  } catch (error) {
    console.error('Error en updateSensor:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un sensor con ese TAG_NAME dentro del PLC seleccionado.' });
    }
    res.status(500).json({ message: 'Error al actualizar sensor', error: error.message });
  }
};

const deleteSensor = async (req, res) => {
  const { id } = req.params;
  try {
    const oldSensor = await db('sensors').where({ id }).first();
    if (!oldSensor) return res.status(404).json({ message: 'Sensor no encontrado' });

    await db('sensors').where({ id }).del();

    await logAudit(
      req.user.id,
      'SENSOR_DELETE',
      id,
      `Se eliminó el sensor: ${oldSensor.tag_name}`,
      oldSensor,
      null,
      req.ip
    );

    res.json({ message: 'Sensor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar sensor', error: error.message });
  }
};

export default { getSensors, getSensorReadings, createSensor, updateSensor, deleteSensor };
