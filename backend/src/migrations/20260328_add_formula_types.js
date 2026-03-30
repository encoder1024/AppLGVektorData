/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // Crear el tipo ENUM para las fórmulas
  await knex.raw(`
    CREATE TYPE formula_type AS ENUM (
      'POLYNOMIAL', 
      'C_TO_F', 
      'F_TO_C', 
      'PSI_TO_BAR', 
      'BAR_TO_PSI',
      'LINEAR_SCALE'
    )
  `);

  await knex.schema.alterTable('calibration_profiles', table => {
    table.specificType('tipo_formula', 'formula_type').notNullable().defaultTo('POLYNOMIAL');
    table.string('descripcion'); // Para notas técnicas del usuario
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.alterTable('calibration_profiles', table => {
    table.dropColumn('tipo_formula');
    table.dropColumn('descripcion');
  });
  await knex.raw('DROP TYPE IF EXISTS formula_type');
};
