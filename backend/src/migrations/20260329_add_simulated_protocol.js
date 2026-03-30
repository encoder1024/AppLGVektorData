/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // Añadir 'SIMULATED' al tipo plc_protocol
  await knex.raw("ALTER TYPE plc_protocol ADD VALUE 'SIMULATED'");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  // Nota: Postgres no permite borrar valores de un ENUM fácilmente, 
  // pero para desarrollo esto no afecta.
};
