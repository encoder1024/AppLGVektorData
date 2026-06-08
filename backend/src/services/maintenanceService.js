import cron from 'node-cron';
import db from '../config/db.js';

const runMaintenance = async (startDate, endDate) => {
  console.log('--- Iniciando consolidación y limpieza de datos ---');
  
  try {
    const retentionConfig = await db('app_config').where({ key: 'retention_policy_days' }).first();
    const days = retentionConfig ? JSON.parse(retentionConfig.value) : 30;
    
    // Calcular rango del día anterior completo (00:00:00 a 23:59:59)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const start = startDate ? new Date(startDate) : new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

    await db.transaction(async (trx) => {
      const consolidarQuery = `
        INSERT INTO sensor_historial_consolidado (sensor_id, promedio_valor_procesado, promedio_valor_crudo, fecha_hora)
        SELECT 
          sensor_id, 
          AVG(valor_procesado) as promedio_valor_procesado,
          AVG(valor_crudo) as promedio_valor_crudo,
          DATE_TRUNC('hour', time) as fecha_hora
        FROM sensor_readings
        WHERE time >= ? AND time <= ?
        GROUP BY sensor_id, fecha_hora;
      `;
      await trx.raw(consolidarQuery, [start, end]);
      
      // 3. Borrar datos antiguos
      await trx('sensor_readings')
        .where('time', '<', trx.raw("NOW() - (INTERVAL '1 day' * ?)", [days]))
        .del();
        
      console.log(`Consolidación completada para el rango ${start.toISOString()} a ${end.toISOString()}.`);
    });
  } catch (err) {
    console.error('Error en el proceso de mantenimiento:', err);
  }
};

// Programar para las 10:00 PM
export const startMaintenanceService = () => {
  cron.schedule('0 22 * * *', () => runMaintenance());
  console.log('Servicio de mantenimiento programado (10:00 PM)');
};

export { runMaintenance };
