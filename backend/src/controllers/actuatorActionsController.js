import db from '../config/db.js'; // Importar la conexión de la base de datos como módulo ES
import { logAudit } from '../utils/auditLogger.js'; // Importar el logger de auditoría

export const getAllActuatorActions = async (req, res) => {
  try {
    const { start, end, actuator_id, user_id, action_type } = req.query;
    let query = db('actuator_actions')
      .select('actuator_actions.*', 'users.full_name as user_name', 'actuators.nombre as actuator_name')
      .leftJoin('users', 'actuator_actions.user_id', 'users.id')
      .leftJoin('actuators', 'actuator_actions.actuator_id', 'actuators.id');

    if (start && end) {
      query = query.whereBetween('timestamp', [start, end]);
    } else if (start) {
      query = query.where('timestamp', '>=', start);
    } else if (end) {
      query = query.where('timestamp', '<=', end);
    }

    if (actuator_id) {
      query = query.where('actuator_actions.actuator_id', actuator_id);
    }
    if (user_id) {
      query = query.where('actuator_actions.user_id', user_id);
    }
    if (action_type) {
      query = query.where('actuator_actions.action_type', action_type);
    }

    const actions = await query.orderBy('timestamp', 'desc');

    // Log the successful retrieval of actuator actions
    const userId = req.user ? req.user.id : null; // Placeholder for actual user ID
    logAudit(userId, 'GET_ACTUATOR_ACTIONS', 'Se obtuvieron acciones de actuadores', {
        queryParameters: req.query,
        count: actions.length
    });

    res.status(200).json(actions);
  } catch (err) {
    console.error("Error fetching actuator actions:", err);
    // Log the error
    const userId = req.user ? req.user.id : null; // Placeholder for actual user ID
    logAudit(userId, 'ERROR_GET_ACTUATOR_ACTIONS', 'Fallo al obtener acciones de actuadores', {
        error: err.message,
        queryParameters: req.query
    });
    res.status(500).json({ error: 'Error interno del servidor al obtener acciones de actuadores.' });
  }
};
