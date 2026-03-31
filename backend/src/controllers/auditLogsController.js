import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const getAllAuditLogs = async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = db('audit_logs').select('*');

    if (start && end) {
      query = query.whereBetween('time', [start, end]);
    } else if (start) {
      query = query.where('time', '>=', start);
    } else if (end) {
      query = query.where('time', '<=', end);
    }

    const logs = await query.orderBy('time', 'desc');
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'GET_AUDIT_LOGS',
      null,
      'Se obtuvieron logs de auditoria',
      null,
      {
        queryParameters: req.query,
        count: logs.length
      }
    );

    res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'ERROR_GET_AUDIT_LOGS',
      null,
      'Fallo al obtener logs de auditoria',
      null,
      {
        error: err.message,
        queryParameters: req.query
      }
    );

    res.status(500).json({
      error: 'Error interno del servidor al obtener logs de auditoria.'
    });
  }
};
