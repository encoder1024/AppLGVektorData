import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import plcManager from '../services/plcManager.js';
import networkMonitor from '../services/networkMonitor.js';

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value, defaultValue = true) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return String(value).trim().toLowerCase() === 'true';
};

const getPlcTableColumns = async () => {
  const info = await db('plcs').columnInfo();
  return new Set(Object.keys(info));
};

const normalizePlcPayload = async (payload) => {
  const columns = await getPlcTableColumns();

  const normalized = {
    nombre: payload.nombre,
    marca: payload.marca,
    protocolo: payload.protocolo,
    ip_address: payload.ip_address,
    puerto: toNullableNumber(payload.puerto) ?? 102,
    unidad_id: toNullableNumber(payload.unidad_id) ?? 1,
    scan_rate_ms: toNullableNumber(payload.scan_rate_ms) ?? 1000,
    activo: columns.has('activo') ? toBoolean(payload.activo, true) : undefined,
    zona: columns.has('zona') ? payload.zona || 'ZONA_A' : undefined,
    orden_dashboard: columns.has('orden_dashboard') ? toNullableNumber(payload.orden_dashboard) ?? 0 : undefined,
    pos_x: columns.has('pos_x') ? toNullableNumber(payload.pos_x) ?? 0 : undefined,
    pos_y: columns.has('pos_y') ? toNullableNumber(payload.pos_y) ?? 0 : undefined,
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([key, value]) => columns.has(key) && value !== undefined)
  );
};

const getPLCs = async (req, res) => {
  try {
    const plcs = await db('plcs').select('*').orderBy('id', 'asc');
    res.json(plcs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener PLCs', error: error.message });
  }
};

const getPLCById = async (req, res) => {
  try {
    const plc = await db('plcs').where({ id: req.params.id }).first();
    if (!plc) return res.status(404).json({ message: 'PLC no encontrado' });
    res.json(plc);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el PLC', error: error.message });
  }
};

const createPLC = async (req, res) => {
  try {
    const payload = await normalizePlcPayload(req.body);
    const [newPlc] = await db('plcs').insert(payload).returning('*');

    if (newPlc.activo) {
      plcManager.connect(newPlc);
    }

    await networkMonitor.refresh();

    await logAudit(
      req.user.id,
      'PLC_CREATE',
      newPlc.id,
      `Se creo el PLC: ${newPlc.nombre} (${newPlc.marca} - ${newPlc.protocolo})`,
      null,
      newPlc,
      req.ip
    );

    res.status(201).json(newPlc);
  } catch (error) {
    console.error('Error en createPLC:', error);
    res.status(500).json({ message: 'Error al crear PLC', error: error.message });
  }
};

const updatePLC = async (req, res) => {
  const { id } = req.params;

  try {
    const oldPlc = await db('plcs').where({ id }).first();
    if (!oldPlc) return res.status(404).json({ message: 'PLC no encontrado' });

    const updates = await normalizePlcPayload(req.body);
    const [updatedPlc] = await db('plcs').where({ id }).update(updates).returning('*');

    if (updatedPlc.activo) {
      plcManager.connect(updatedPlc);
    } else {
      plcManager.disconnect(updatedPlc.id);
    }

    await networkMonitor.refresh();

    await logAudit(
      req.user.id,
      'PLC_UPDATE',
      id,
      `Se actualizo la configuracion del PLC: ${oldPlc.nombre}`,
      oldPlc,
      updatedPlc,
      req.ip
    );

    res.json(updatedPlc);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar PLC', error: error.message });
  }
};

const deletePLC = async (req, res) => {
  const { id } = req.params;

  try {
    const oldPlc = await db('plcs').where({ id }).first();
    if (!oldPlc) return res.status(404).json({ message: 'PLC no encontrado' });

    await db('plcs').where({ id }).del();
    plcManager.disconnect(id);

    await networkMonitor.refresh();

    await logAudit(
      req.user.id,
      'PLC_DELETE',
      id,
      `Se elimino el PLC: ${oldPlc.nombre}`,
      oldPlc,
      null,
      req.ip
    );

    res.json({ message: 'PLC eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar PLC', error: error.message });
  }
};

export default { getPLCs, getPLCById, createPLC, updatePLC, deletePLC };
