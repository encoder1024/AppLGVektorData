import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const getAllSensorEvents = async (req, res) => {
  try {
    const { start, end, sensor_id, event_type } = req.query;
    let query = db('sensor_events')
      .select('sensor_events.*', 'sensors.tag_name as sensor_name', 'sensors.unidad_medida as unit')
      .leftJoin('sensors', 'sensor_events.sensor_id', 'sensors.id');

    if (start && end) {
      query = query.whereBetween('timestamp', [start, end]);
    } else if (start) {
      query = query.where('timestamp', '>=', start);
    } else if (end) {
      query = query.where('timestamp', '<=', end);
    }

    if (sensor_id) {
      query = query.where('sensor_events.sensor_id', sensor_id);
    }
    if (event_type) {
      query = query.where('sensor_events.event_type', event_type);
    }

    const events = await query.orderBy('timestamp', 'desc');
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'GET_SENSOR_EVENTS',
      null,
      'Se obtuvieron eventos de sensores',
      null,
      {
        queryParameters: req.query,
        count: events.length
      }
    );

    res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching sensor events:', err);
    const userId = req.user ? req.user.id : null;

    await logAudit(
      userId,
      'ERROR_GET_SENSOR_EVENTS',
      null,
      'Fallo al obtener eventos de sensores',
      null,
      {
        error: err.message,
        queryParameters: req.query
      }
    );

    res.status(500).json({ error: 'Error interno del servidor al obtener eventos de sensores.' });
  }
};
