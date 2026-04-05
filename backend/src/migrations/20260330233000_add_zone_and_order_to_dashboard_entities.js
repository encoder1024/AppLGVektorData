/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.alterTable('plcs', (table) => {
    table.string('zona').notNullable().defaultTo('ZONA_A');
    table.integer('orden_dashboard').notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('sensors', (table) => {
    table.string('zona').notNullable().defaultTo('ZONA_A');
    table.integer('orden_dashboard').notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('actuators', (table) => {
    table.string('zona').notNullable().defaultTo('ZONA_A');
    table.integer('orden_dashboard').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.alterTable('actuators', (table) => {
    table.dropColumn('zona');
    table.dropColumn('orden_dashboard');
  });

  await knex.schema.alterTable('sensors', (table) => {
    table.dropColumn('zona');
    table.dropColumn('orden_dashboard');
  });

  await knex.schema.alterTable('plcs', (table) => {
    table.dropColumn('zona');
    table.dropColumn('orden_dashboard');
  });
};
