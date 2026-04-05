export async function up(knex) {
  await knex.schema.createTable('system_health_snapshots', (table) => {
    table.increments('id').primary();
    table.timestamp('snapshot_time').notNullable().defaultTo(knex.fn.now());
    table.string('component_type').notNullable();
    table.integer('component_id').notNullable();
    table.string('component_name').notNullable();
    table.string('zone');
    table.integer('parent_plc_id');
    table.string('status').notNullable();
    table.boolean('is_available').notNullable().defaultTo(false);
    table.string('communication_state').notNullable();
    table.integer('latency_ms');
    table.timestamp('last_response_at');
    table.integer('timeout_count').notNullable().defaultTo(0);
    table.integer('error_count').notNullable().defaultTo(0);
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['snapshot_time'], 'system_health_snapshots_snapshot_time_idx');
    table.index(['component_type', 'component_id'], 'system_health_snapshots_component_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('system_health_snapshots');
}
