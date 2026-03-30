import db from '../config/db.js'; // Importar la conexión de la base de datos como módulo ES
import { logAudit } from '../utils/auditLogger.js'; // Importar el logger de auditoría

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

    // Log the successful retrieval of sensor events
    const userId = req.user ? req.user.id : null; // Placeholder for actual user ID
    logAudit(userId, 'GET_SENSOR_EVENTS', 'Se obtuvieron eventos de sensores', {
        queryParameters: req.query,
        count: events.length
    });

    res.status(200).json(events);
  } catch (err) {
    console.error("Error fetching sensor events:", err);
    // Log the error
    const userId = req.user ? req.user.id : null; // Placeholder for actual user ID
    logAudit(userId, 'ERROR_GET_SENSOR_EVENTS', 'Fallo al obtener eventos de sensores', {
        error: err.message,
        queryParameters: req.query
    });
    res.status(500).json({ error: 'Error interno del servidor al obtener eventos de sensores.' });
  }
};
