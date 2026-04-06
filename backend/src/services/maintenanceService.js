import cron from 'node-cron';
import db from '../config/db.js';

const runMaintenance = async () => {
  console.log('--- Iniciando consolidación y limpieza de datos ---');
  
  try {
    // 1. Obtener política de retención desde la BD
    const retentionConfig = await db('app_config').where({ key: 'retention_policy_days' }).first();
    const days = retentionConfig ? JSON.parse(retentionConfig.value) : 30;
    
    await db.transaction(async (trx) => {
      // 2. Consolidar datos (promedio por hora del día anterior)
      const consolidarQuery = `
        INSERT INTO sensor_historial_consolidado (sensor_id, promedio_valor_procesado, promedio_valor_crudo, fecha_hora)
        SELECT 
          sensor_id, 
          AVG(valor_procesado) as promedio_valor_procesado,
          AVG(valor_crudo) as promedio_valor_crudo,
          DATE_TRUNC('hour', time) as fecha_hora
        FROM sensor_readings
        WHERE time >= NOW() - INTERVAL '1 day'
        GROUP BY sensor_id, fecha_hora;
      `;
      await trx.raw(consolidarQuery);
      
      // 3. Borrar datos antiguos basados en la política
      await trx('sensor_readings')
        .where('time', '<', db.raw('NOW() - INTERVAL ?? days', [days]))
        .del();
        
      console.log(`Consolidación completada. Registros anteriores a ${days} días eliminados.`);
    });
  } catch (err) {
    console.error('Error en el proceso de mantenimiento:', err);
  }
};

// Programar para las 01:00 AM
export const startMaintenanceService = () => {
  cron.schedule('0 1 * * *', runMaintenance);
  console.log('Servicio de mantenimiento programado (01:00 AM)');
};
