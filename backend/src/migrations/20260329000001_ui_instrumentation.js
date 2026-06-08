/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. ENUMs para Visualización y Control
  await knex.raw(`
    CREATE TYPE instrument_ui_type AS ENUM (
      'GAUGE_RADIAL', 
      'GAUGE_LINEAR', 
      'TERMOMETRO_SIMPLE', 
      'TERMOMETRO_DETALLADO', 
      'NIVEL_TANQUE', 
      'VALOR_DIGITAL'
    )
  `);

  await knex.raw(`
    CREATE TYPE actuator_ui_type AS ENUM (
      'SWITCH_ON_OFF', 
      'SELECTOR_MODO', 
      'PULSADOR_MOMENTANEO', 
      'DESLIZADOR_ANALOGICO'
    )
  `);

  // 2. Añadir columnas a Sensores
  await knex.schema.alterTable('sensors', table => {
    table.specificType('tipo_instrumento', 'instrument_ui_type').notNullable().defaultTo('GAUGE_RADIAL');
  });

  // 3. Tipificar la tabla de Actuadores (que aún no tiene CRUD)
  await knex.schema.alterTable('actuators', table => {
    table.specificType('tipo_ui', 'actuator_ui_type').notNullable().defaultTo('SWITCH_ON_OFF');
    table.specificType('tipo_dato_plc', 'data_type').notNullable().defaultTo('BOOLEAN');
    table.double('min_val').defaultTo(0);
    table.double('max_val').defaultTo(1);
    table.boolean('activo').defaultTo(true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.alterTable('actuators', table => {
    table.dropColumn('tipo_ui');
    table.dropColumn('tipo_dato_plc');
    table.dropColumn('min_val');
    table.dropColumn('max_val');
    table.dropColumn('activo');
  });
  await knex.schema.alterTable('sensors', table => {
    table.dropColumn('tipo_instrumento');
  });
  await knex.raw('DROP TYPE IF EXISTS actuator_ui_type');
  await knex.raw('DROP TYPE IF EXISTS instrument_ui_type');
};
