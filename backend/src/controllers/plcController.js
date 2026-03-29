import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

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
  const { nombre, marca, protocolo, ip_address, puerto, unidad_id, scan_rate_ms } = req.body;

  try {
    const [newPlc] = await db('plcs')
      .insert({
        nombre,
        marca,
        protocolo,
        ip_address,
        puerto,
        unidad_id: unidad_id || 1,
        scan_rate_ms: scan_rate_ms || 1000
      })
      .returning('*');

    // Registrar en auditoría (Ticket 2.4)
    await logAudit(
      req.user.id,
      'PLC_CREATE',
      newPlc.id,
      `Se creó el PLC: ${nombre} (${marca} - ${protocolo})`,
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
  const updates = req.body;

  try {
    const oldPlc = await db('plcs').where({ id }).first();
    if (!oldPlc) return res.status(404).json({ message: 'PLC no encontrado' });

    const [updatedPlc] = await db('plcs')
      .where({ id })
      .update(updates)
      .returning('*');

    // Registrar en auditoría
    await logAudit(
      req.user.id,
      'PLC_UPDATE',
      id,
      `Se actualizó la configuración del PLC: ${oldPlc.nombre}`,
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

    // Registrar en auditoría
    await logAudit(
      req.user.id,
      'PLC_DELETE',
      id,
      `Se eliminó el PLC: ${oldPlc.nombre}`,
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
