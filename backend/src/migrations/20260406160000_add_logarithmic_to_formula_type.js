/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // En PostgreSQL no se puede agregar un valor a un ENUM dentro de una transacción con ALTER TYPE.
  // Pero knex por defecto corre las migraciones en transacciones. 
  // Usamos knex.raw para ejecutarlo directamente.
  await knex.raw("ALTER TYPE formula_type ADD VALUE IF NOT EXISTS 'LOGARITHMIC'");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  // PostgreSQL no soporta remover un valor de un ENUM fácilmente con ALTER TYPE.
  // Por simplicidad en entornos de dev, no hacemos nada o advertimos.
  console.warn("La remoción de valores de un ENUM no está soportada nativamente por PostgreSQL sin recrear el tipo.");
};
