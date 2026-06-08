/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.createTable('network_health_logs', table => {
    table.timestamp('time').notNullable().defaultTo(knex.fn.now());
    table.string('node_id').notNullable(); // 'plc-1', 'switch-A', etc.
    table.string('status').notNullable();  // UP, DOWN, DEGRADED
    table.double('latency');               // en ms
    table.string('ip').notNullable();
  });

  // Convertir en Hypertable para TimescaleDB
  await knex.raw("SELECT create_hypertable('network_health_logs', 'time', if_not_exists => TRUE)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('network_health_logs');
};
