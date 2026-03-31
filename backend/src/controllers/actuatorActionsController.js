import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

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
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'GET_ACTUATOR_ACTIONS',
      null,
      'Se obtuvieron acciones de actuadores',
      null,
      {
        queryParameters: req.query,
        count: actions.length
      }
    );

    res.status(200).json(actions);
  } catch (err) {
    console.error('Error fetching actuator actions:', err);
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'ERROR_GET_ACTUATOR_ACTIONS',
      null,
      'Fallo al obtener acciones de actuadores',
      null,
      {
        error: err.message,
        queryParameters: req.query
      }
    );

    res.status(500).json({ error: 'Error interno del servidor al obtener acciones de actuadores.' });
  }
};
