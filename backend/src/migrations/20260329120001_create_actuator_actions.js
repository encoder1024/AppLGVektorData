/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.createTable('actuator_actions', table => {
    table.increments('id').primary();
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.integer('user_id').references('id').inTable('users');
    table.integer('actuator_id').references('id').inTable('actuators').onDelete('CASCADE');
    table.string('action_type').notNullable(); // Ej: 'SET_STATE', 'SET_VALUE'
    table.jsonb('details'); // Para almacenar detalles como valor anterior/nuevo, parámetros, etc.
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('actuator_actions');
};
