/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. Definir tipos ENUM para eventos de sensores si es necesario (ej. para el tipo de evento)
  // (Podríamos añadir esto si se requiere una lista fija de tipos de evento)
  // await knex.raw("CREATE TYPE sensor_event_type AS ENUM ('ALERT_HIGH', 'ALERT_LOW', 'WARNING_HIGH', 'WARNING_LOW', 'STATE_CHANGE')");

  await knex.schema.createTable('sensor_events', table => {
    table.increments('id').primary();
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.integer('sensor_id').references('id').inTable('sensors').onDelete('CASCADE');
    // Si defines un ENUM, usa: table.specificType('event_type', 'sensor_event_type').notNullable();
    table.string('event_type').notNullable(); // Usamos string simple por ahora si no hay ENUM definido
    table.text('message');
    table.double('value'); // Valor del sensor en el momento del evento
    table.string('unit'); // Unidad de medida del sensor
  });

  // Si creaste un ENUM, descomenta esta línea:
  // await knex.raw("SELECT create_hypertable('sensor_events', 'timestamp', if_not_exists => TRUE)");
  // Nota: Si los eventos son muy frecuentes y necesitas optimización temporal, podrías convertirla en hypertable.
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('sensor_events');
  // Si creaste un ENUM, descomenta esta línea:
  // await knex.raw('DROP TYPE IF EXISTS sensor_event_type');
};
