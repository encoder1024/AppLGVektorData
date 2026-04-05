import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import plcManager from '../services/plcManager.js';

const getActuatorTableColumns = async () => {
  const columnInfo = await db('actuators').columnInfo();
  return new Set(Object.keys(columnInfo));
};

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
};

const toBoolean = (value, defaultValue = true) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'on', 'si', 'sí'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

const normalizeActuatorPayload = async (payload) => {
  const columns = await getActuatorTableColumns();
  const normalized = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!columns.has(key)) {
      return;
    }

    if (['plc_id', 'min_val', 'max_val'].includes(key)) {
      normalized[key] = toNullableNumber(value);
      return;
    }

    if (key === 'activo') {
      normalized[key] = toBoolean(value, true);
      return;
    }

    normalized[key] = value === '' ? null : value;
  });

  if (columns.has('tipo_ui') && !normalized.tipo_ui) {
    normalized.tipo_ui = 'SWITCH_ON_OFF';
  }
  if (columns.has('tipo_dato_plc') && !normalized.tipo_dato_plc) {
    normalized.tipo_dato_plc = 'BOOLEAN';
  }
  if (columns.has('tipo_signal') && !normalized.tipo_signal) {
    normalized.tipo_signal = 'DIGITAL_OUTPUT';
  }
  if (columns.has('min_val') && normalized.min_val === null) {
    normalized.min_val = 0;
  }
  if (columns.has('max_val') && normalized.max_val === null) {
    normalized.max_val = 1;
  }

  return normalized;
};

const getActuators = async (req, res) => {
  try {
    const actuators = await db('actuators as a')
      .select('a.*', 'p.nombre as plc_nombre', 'p.protocolo as plc_protocolo')
      .leftJoin('plcs as p', 'a.plc_id', 'p.id')
      .orderBy('a.nombre', 'asc');
    res.json(actuators);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener actuadores', error: error.message });
  }
};

const createActuator = async (req, res) => {
  try {
    const payload = await normalizeActuatorPayload(req.body);
    const [newActuator] = await db('actuators').insert(payload).returning('*');

    await logAudit(
      req.user.id,
      'ACTUATOR_CREATE',
      newActuator.id,
      `Se configuro el actuador: ${newActuator.nombre} en PLC ID: ${newActuator.plc_id}`,
      null,
      newActuator,
      req.ip
    );

    res.status(201).json(newActuator);
  } catch (error) {
    console.error('Error al crear actuador:', error);
    res.status(500).json({ message: 'Error al crear actuador', error: error.message });
  }
};

const updateActuator = async (req, res) => {
  const { id } = req.params;

  try {
    const oldActuator = await db('actuators').where({ id }).first();
    if (!oldActuator) {
      return res.status(404).json({ message: 'Actuador no encontrado' });
    }

    const updates = await normalizeActuatorPayload(req.body);
    const [updatedActuator] = await db('actuators').where({ id }).update(updates).returning('*');

    await logAudit(
      req.user.id,
      'ACTUATOR_UPDATE',
      id,
      `Se actualizo la configuracion del actuador: ${oldActuator.nombre}`,
      oldActuator,
      updatedActuator,
      req.ip
    );

    res.json(updatedActuator);
  } catch (error) {
    console.error('Error al actualizar actuador:', error);
    res.status(500).json({ message: 'Error al actualizar actuador', error: error.message });
  }
};

const deleteActuator = async (req, res) => {
  const { id } = req.params;
  try {
    const oldActuator = await db('actuators').where({ id }).first();
    if (!oldActuator) {
      return res.status(404).json({ message: 'Actuador no encontrado' });
    }

    await db('actuators').where({ id }).del();

    await logAudit(
      req.user.id,
      'ACTUATOR_DELETE',
      id,
      `Se elimino el actuador: ${oldActuator.nombre}`,
      oldActuator,
      null,
      req.ip
    );

    res.json({ message: 'Actuador eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar actuador', error: error.message });
  }
};

const normalizeBooleanCommand = (input) => {
  if (typeof input === 'boolean') {
    return input;
  }
  if (typeof input === 'number') {
    return input !== 0;
  }
  if (typeof input === 'string') {
    const normalized = input.trim().toUpperCase();
    if (['1', 'TRUE', 'ON', 'ENCENDER', 'ACTIVAR', 'START', 'OPEN'].includes(normalized)) {
      return true;
    }
    if (['0', 'FALSE', 'OFF', 'APAGAR', 'DESACTIVAR', 'STOP', 'CLOSE'].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const controlActuator = async (req, res) => {
  const { id } = req.params;
  const { state, value, pulse_ms: pulseMsInput } = req.body;

  try {
    const actuator = await db('actuators as a')
      .select('a.*', 'p.nombre as plc_nombre', 'p.protocolo as plc_protocolo', 'p.activo as plc_activo')
      .leftJoin('plcs as p', 'a.plc_id', 'p.id')
      .where('a.id', id)
      .first();

    if (!actuator) {
      return res.status(404).json({ message: 'Actuador no encontrado' });
    }

    if (actuator.activo === false) {
      return res.status(400).json({ message: 'El actuador esta inactivo' });
    }

    if (!actuator.plc_activo) {
      return res.status(400).json({ message: 'El PLC asociado esta inactivo' });
    }

    const isPulse = actuator.tipo_ui === 'PULSADOR_MOMENTANEO';
    const booleanState = normalizeBooleanCommand(state ?? value);

    if (booleanState === null && !isPulse) {
      return res.status(400).json({ message: 'El comando del actuador debe ser ON u OFF' });
    }

    const commandValue = isPulse ? true : booleanState;
    const pulseMs = Math.min(Math.max(Number(pulseMsInput) || 400, 150), 3000);

    await plcManager.writeActuator(actuator, commandValue);

    const actionType = isPulse ? 'PULSE' : 'SET_STATE';
    const details = {
      source: 'dashboard',
      state: commandValue,
      pulse_ms: isPulse ? pulseMs : null
    };

    const [action] = await db('actuator_actions')
      .insert({
        user_id: req.user.id,
        actuator_id: actuator.id,
        action_type: actionType,
        details
      })
      .returning('*');

    await logAudit(
      req.user.id,
      'ACTUATOR_COMMAND',
      actuator.id,
      `Se ejecuto comando ${actionType} sobre el actuador ${actuator.nombre}`,
      null,
      details,
      req.ip
    );

    if (isPulse) {
      setTimeout(async () => {
        try {
          await plcManager.writeActuator(actuator, false);
        } catch (error) {
          console.error(`Error al resetear pulso del actuador ${actuator.id}:`, error.message);
        }
      }, pulseMs);
    }

    res.status(200).json({
      message: isPulse ? 'Pulso enviado correctamente' : 'Estado del actuador actualizado',
      action
    });
  } catch (error) {
    console.error('Error al controlar actuador:', error);
    if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({
        message: `Conexion rechazada por el PLC en ${error.address}:${error.port}. Revisar protocolo y puerto configurados.`,
        error: error.message
      });
    }

    if (error.message?.includes('No se pudo establecer conexion con el PLC')) {
      return res.status(502).json({
        message: `${error.message}. Verificar que el PLC este accesible en red y que el protocolo configurado sea correcto.`,
        error: error.message
      });
    }

    if (error.message?.includes('PLC no conectado') || error.message?.includes('PLC inactivo')) {
      return res.status(400).json({ message: error.message, error: error.message });
    }

    res.status(500).json({ message: 'Error al controlar actuador', error: error.message });
  }
};

export default { getActuators, createActuator, updateActuator, deleteActuator, controlActuator };
