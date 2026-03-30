import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

const getProfiles = async (req, res) => {
  try {
    const profiles = await db('calibration_profiles').select('*').orderBy('nombre', 'asc');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfiles', error: error.message });
  }
};

const createProfile = async (req, res) => {
  const profileData = { ...req.body, creado_por: req.user.id };

  try {
    const [newProfile] = await db('calibration_profiles').insert(profileData).returning('*');
    
    await logAudit(
      req.user.id,
      'PROFILE_CREATE',
      newProfile.id,
      `Se creó el perfil de calibración: ${newProfile.nombre} (${newProfile.tipo_formula})`,
      null,
      newProfile,
      req.ip
    );

    res.status(201).json(newProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear perfil', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { id } = req.params;
  
  try {
    const oldProfile = await db('calibration_profiles').where({ id }).first();
    if (!oldProfile) return res.status(404).json({ message: 'Perfil no encontrado' });

    const [updatedProfile] = await db('calibration_profiles').where({ id }).update(req.body).returning('*');

    await logAudit(
      req.user.id,
      'PROFILE_UPDATE',
      id,
      `Se actualizó el perfil de calibración: ${oldProfile.nombre}`,
      oldProfile,
      updatedProfile,
      req.ip
    );

    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
  }
};

const deleteProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const oldProfile = await db('calibration_profiles').where({ id }).first();
    if (!oldProfile) return res.status(404).json({ message: 'Perfil no encontrado' });

    await db('calibration_profiles').where({ id }).del();

    await logAudit(
      req.user.id,
      'PROFILE_DELETE',
      id,
      `Se eliminó el perfil: ${oldProfile.nombre}`,
      oldProfile,
      null,
      req.ip
    );

    res.json({ message: 'Perfil eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar perfil (verificar si está en uso por sensores)', error: error.message });
  }
};

export default { getProfiles, createProfile, updateProfile, deleteProfile };
