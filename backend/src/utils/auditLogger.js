import db from '../config/db.js';

/**
 * Registra una acción en el log de auditoría
 * @param {number} userId - ID del usuario que realiza la acción
 * @param {string} type - Tipo de acción (EJ: PLC_CREATE, SENSOR_UPDATE)
 * @param {number} targetId - ID del recurso afectado
 * @param {string} description - Detalle legible de la acción
 * @param {object} oldVal - Valor anterior (opcional)
 * @param {object} newVal - Valor nuevo (opcional)
 * @param {string} ip - IP del cliente
 */
export const logAudit = async (userId, type, targetId, description, oldVal = null, newVal = null, ip = null) => {
  try {
    await db('audit_logs').insert({
      user_id: userId,
      accion_tipo: type,
      target_id: targetId,
      descripcion: description,
      valor_anterior: oldVal ? JSON.stringify(oldVal) : null,
      valor_nuevo: newVal ? JSON.stringify(newVal) : null,
      ip_cliente: ip
    });
  } catch (error) {
    console.error('❌ Error al registrar auditoría:', error);
  }
};
