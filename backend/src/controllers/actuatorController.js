import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

const getActuators = async (req, res) => {
  try {
    const actuators = await db('actuators as a')
      .select('a.*', 'p.nombre as plc_nombre')
      .leftJoin('plcs as p', 'a.plc_id', 'p.id')
      .orderBy('a.nombre', 'asc');
    res.json(actuators);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener actuadores', error: error.message });
  }
};

const createActuator = async (req, res) => {
  try {
    const [newActuator] = await db('actuators').insert(req.body).returning('*');

    await logAudit(
      req.user.id,
      'ACTUATOR_CREATE',
      newActuator.id,
      `Se configuró el actuador: ${newActuator.nombre} en PLC ID: ${newActuator.plc_id}`,
      null,
      newActuator,
      req.ip
    );

    res.status(201).json(newActuator);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear actuador', error: error.message });
  }
};

const updateActuator = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  delete updates.id;
  delete updates.plc_nombre;
  delete updates.created_at;

  try {
    const oldActuator = await db('actuators').where({ id }).first();
    if (!oldActuator) return res.status(404).json({ message: 'Actuador no encontrado' });

    const [updatedActuator] = await db('actuators').where({ id }).update(updates).returning('*');

    await logAudit(
      req.user.id,
      'ACTUATOR_UPDATE',
      id,
      `Se actualizó la configuración del actuador: ${oldActuator.nombre}`,
      oldActuator,
      updatedActuator,
      req.ip
    );

    res.json(updatedActuator);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar actuador', error: error.message });
  }
};

const deleteActuator = async (req, res) => {
  const { id } = req.params;
  try {
    const oldActuator = await db('actuators').where({ id }).first();
    if (!oldActuator) return res.status(404).json({ message: 'Actuador no encontrado' });

    await db('actuators').where({ id }).del();

    await logAudit(
      req.user.id,
      'ACTUATOR_DELETE',
      id,
      `Se eliminó el actuador: ${oldActuator.nombre}`,
      oldActuator,
      null,
      req.ip
    );

    res.json({ message: 'Actuador eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar actuador', error: error.message });
  }
};

export default { getActuators, createActuator, updateActuator, deleteActuator };
