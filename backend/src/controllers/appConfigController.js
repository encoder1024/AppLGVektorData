import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

const getAllConfigs = async (req, res) => {
  try {
    const configs = await db('app_config').select('*');
    res.json(configs);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

const getConfigByKey = async (req, res) => {
  const { key } = req.params;
  try {
    const config = await db('app_config').where({ key }).first();
    if (!config) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

const updateConfig = async (req, res) => {
  const { key, value } = req.body;

  try {
    const oldConfig = await db('app_config').where({ key }).first();
    
    if (oldConfig) {
      await db('app_config')
        .where({ key })
        .update({ 
          value: JSON.stringify(value),
          updated_at: db.fn.now() 
        });

      await logAudit(
        req.user.id,
        'APP_CONFIG_UPDATE',
        null,
        `Configuración global actualizada: ${key}`,
        oldConfig.value,
        value,
        req.ip
      );
    } else {
      await db('app_config').insert({
        key,
        value: JSON.stringify(value),
        updated_at: db.fn.now()
      });

      await logAudit(
        req.user.id,
        'APP_CONFIG_CREATE',
        null,
        `Nueva configuración global creada: ${key}`,
        null,
        value,
        req.ip
      );
    }

    res.json({ message: 'Configuración guardada con éxito' });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ message: 'Error al guardar configuración' });
  }
};

export default { getAllConfigs, getConfigByKey, updateConfig };
