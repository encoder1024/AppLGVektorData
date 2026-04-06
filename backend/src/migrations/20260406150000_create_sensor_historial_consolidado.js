/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.createTable('sensor_historial_consolidado', table => {
    table.increments('id').primary();
    table.integer('sensor_id').notNullable();
    table.float('promedio_valor_procesado');
    table.float('promedio_valor_crudo');
    table.timestamp('fecha_hora').notNullable(); 
    
    table.index(['sensor_id', 'fecha_hora']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.dropTableIfExists('sensor_historial_consolidado');
};
