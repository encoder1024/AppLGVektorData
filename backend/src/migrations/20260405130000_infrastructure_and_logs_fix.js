/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. Tipos de nodos de infraestructura
  await knex.raw("CREATE TYPE infra_node_type AS ENUM ('SWITCH', 'SERVER', 'ROUTER', 'GATEWAY', 'ACCESS_POINT')");

  // 2. Tabla de Infraestructura de Red
  await knex.schema.createTable('infrastructure_nodes', table => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.specificType('tipo', 'infra_node_type').notNullable().defaultTo('SWITCH');
    table.string('ip_address').notNullable();
    table.text('descripcion');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. Modificar network_health_logs para ser más preciso
  // Borramos la anterior para rehacerla con la relación correcta
  await knex.schema.dropTableIfExists('network_health_logs');
  
  await knex.schema.createTable('network_health_logs', table => {
    table.timestamp('time').notNullable().defaultTo(knex.fn.now());
    table.enum('node_type', ['PLC', 'INFRA']).notNullable();
    table.integer('target_id').notNullable(); // ID de la tabla plcs o infrastructure_nodes
    table.string('status').notNullable();
    table.double('latency');
    table.string('ip');
  });

  // Re-crear Hypertable
  await knex.raw("SELECT create_hypertable('network_health_logs', 'time', if_not_exists => TRUE)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('network_health_logs');
  await knex.schema.dropTableIfExists('infrastructure_nodes');
  await knex.raw('DROP TYPE IF EXISTS infra_node_type CASCADE');
};
