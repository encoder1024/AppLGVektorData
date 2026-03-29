import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

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

const createSensor = async (req, res) => {
  try {
    const [newSensor] = await db('sensors').insert(req.body).returning('*');

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
    res.status(500).json({ message: 'Error al crear sensor', error: error.message });
  }
};

const updateSensor = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

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

export default { getSensors, createSensor, updateSensor, deleteSensor };
