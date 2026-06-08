/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.raw("CREATE TYPE connection_type AS ENUM ('WIRED', 'WIRELESS', 'FIBER', 'LOGICAL', 'VLAN')");

  await knex.schema.createTable('infrastructure_connections', table => {
    table.increments('id').primary();
    
    // Source Node
    table.string('source_id').notNullable(); // e.g., 'infra-1', 'plc-5'
    
    // Target Node
    table.string('target_id').notNullable(); // e.g., 'infra-2', 'plc-3'
    
    table.specificType('type', 'connection_type').notNullable().defaultTo('WIRED');
    table.text('metadata'); // For additional info like port, ssid, etc.
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint to prevent duplicate connections between same nodes
    table.unique(['source_id', 'target_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('infrastructure_connections');
  await knex.raw('DROP TYPE IF EXISTS connection_type CASCADE');
};
