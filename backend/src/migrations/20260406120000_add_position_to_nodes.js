/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.table('infrastructure_nodes', table => {
    table.integer('pos_x').defaultTo(0);
    table.integer('pos_y').defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.table('infrastructure_nodes', table => {
    table.dropColumn('pos_x');
    table.dropColumn('pos_y');
  });
};
