/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. Extensiones y Tipos ENUM (Raw SQL)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
  
  // Borrar tipos previos si existen para evitar errores al re-migrar en limpio
  const dropTypes = [
    'DROP TYPE IF EXISTS user_role CASCADE',
    'DROP TYPE IF EXISTS plc_brand CASCADE',
    'DROP TYPE IF EXISTS plc_protocol CASCADE',
    'DROP TYPE IF EXISTS signal_type CASCADE',
    'DROP TYPE IF EXISTS data_type CASCADE'
  ];
  for (const sql of dropTypes) await knex.raw(sql);

  await knex.raw("CREATE TYPE user_role AS ENUM ('ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN')");
  await knex.raw("CREATE TYPE plc_brand AS ENUM ('SIEMENS', 'SCHNEIDER', 'ALLEN_BRADLEY', 'DELTA', 'ARDUINO', 'OTHER')");
  await knex.raw("CREATE TYPE plc_protocol AS ENUM ('MODBUS_TCP', 'S7', 'ETHERNET_IP', 'OPC_UA', 'MQTT')");
  await knex.raw("CREATE TYPE signal_type AS ENUM ('ANALOG_INPUT', 'ANALOG_OUTPUT', 'DIGITAL_INPUT', 'DIGITAL_OUTPUT')");
  await knex.raw("CREATE TYPE data_type AS ENUM ('INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'BOOLEAN')");

  // 2. Usuarios
  await knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.text('password_hash').notNullable();
    table.string('full_name');
    table.specificType('role', 'user_role').notNullable().defaultTo('TECHNICIAN');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. Perfiles de Calibración
  await knex.schema.createTable('calibration_profiles', table => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.double('c0').defaultTo(0);
    table.double('c1').defaultTo(1);
    table.double('c2').defaultTo(0);
    table.double('c3').defaultTo(0);
    table.double('c4').defaultTo(0);
    table.integer('creado_por').references('id').inTable('users');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 4. PLCs
  await knex.schema.createTable('plcs', table => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.specificType('marca', 'plc_brand').notNullable();
    table.specificType('protocolo', 'plc_protocol').notNullable();
    table.string('ip_address').notNullable();
    table.integer('puerto').notNullable();
    table.integer('unidad_id').defaultTo(1);
    table.integer('scan_rate_ms').defaultTo(1000);
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 5. Sensores
  await knex.schema.createTable('sensors', table => {
    table.increments('id').primary();
    table.integer('plc_id').references('id').inTable('plcs').onDelete('CASCADE');
    table.string('tag_name').unique().notNullable();
    table.specificType('tipo_signal', 'signal_type').notNullable();
    table.specificType('tipo_dato_plc', 'data_type').notNullable();
    table.string('direccion_memoria');
    table.string('unidad_medida');
    table.integer('calibration_profile_id').references('id').inTable('calibration_profiles');
    table.double('min_range').defaultTo(0);
    table.double('max_range').defaultTo(100);
    table.double('warning_low');
    table.double('warning_high');
    table.double('alert_low');
    table.double('alert_high');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 6. Actuadores
  await knex.schema.createTable('actuators', table => {
    table.increments('id').primary();
    table.integer('plc_id').references('id').inTable('plcs').onDelete('CASCADE');
    table.string('nombre').notNullable();
    table.specificType('tipo_signal', 'signal_type').notNullable();
    table.string('direccion_memoria').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 7. Sensor Readings (Series Temporales - Hypertable)
  await knex.schema.createTable('sensor_readings', table => {
    table.timestamp('time').notNullable();
    table.integer('sensor_id').references('id').inTable('sensors').onDelete('CASCADE');
    table.double('valor_procesado').notNullable();
    table.double('valor_crudo');
  });
  // Convertir en Hypertable (Raw SQL)
  await knex.raw("SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE)");

  // 8. Audit Logs
  await knex.schema.createTable('audit_logs', table => {
    table.increments('id').primary();
    table.timestamp('time').defaultTo(knex.fn.now());
    table.integer('user_id').references('id').inTable('users');
    table.string('accion_tipo').notNullable();
    table.integer('target_id');
    table.text('descripcion');
    table.text('valor_anterior');
    table.text('valor_nuevo');
    table.string('ip_cliente');
  });

  // 9. Configuración Global
  await knex.schema.createTable('app_config', table => {
    table.string('key').primary();
    table.jsonb('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('app_config');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('sensor_readings');
  await knex.schema.dropTableIfExists('actuators');
  await knex.schema.dropTableIfExists('sensors');
  await knex.schema.dropTableIfExists('plcs');
  await knex.schema.dropTableIfExists('calibration_profiles');
  await knex.schema.dropTableIfExists('users');
};
