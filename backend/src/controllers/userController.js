import db from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';

const getAllUsers = async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'email', 'full_name', 'role', 'is_active', 'created_at')
      .orderBy('id', 'asc');
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const oldUser = await db('users').where({ id }).first();
    if (!oldUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await db('users')
      .where({ id })
      .update({ role });

    await logAudit(
      req.user.id,
      'USER_ROLE_UPDATE',
      id,
      `Rol de usuario ${oldUser.email} actualizado de ${oldUser.role} a ${role}`,
      { role: oldUser.role },
      { role },
      req.ip
    );

    res.json({ message: 'Rol de usuario actualizado con éxito' });
  } catch (error) {
    console.error('Error al actualizar rol de usuario:', error);
    res.status(500).json({ message: 'Error al actualizar rol de usuario' });
  }
};

const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const oldUser = await db('users').where({ id }).first();
    if (!oldUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await db('users')
      .where({ id })
      .update({ is_active });

    await logAudit(
      req.user.id,
      'USER_STATUS_TOGGLE',
      id,
      `Estado del usuario ${oldUser.email} cambiado a ${is_active ? 'ACTIVO' : 'INACTIVO'}`,
      { is_active: oldUser.is_active },
      { is_active },
      req.ip
    );

    res.json({ message: `Usuario ${is_active ? 'activado' : 'desactivado'} con éxito` });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ message: 'Error al cambiar estado de usuario' });
  }
};

export default { getAllUsers, updateUserRole, toggleUserStatus };
