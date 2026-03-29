import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // 1. Verificar si el usuario admin ya existe
  const adminExists = await knex('users').where({ email: 'admin@vektor.com' }).first();

  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('admin123', salt);

    await knex('users').insert({
      email: 'admin@vektor.com',
      password_hash: password_hash,
      full_name: 'Administrador Sistema',
      role: 'ADMIN',
      is_active: true
    });
    console.log('✅ Usuario administrador inicial creado: admin@vektor.com / admin123');
  } else {
    console.log('ℹ️ El usuario administrador ya existe, omitiendo seed.');
  }
};
