/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.raw(`
    ALTER TABLE sensors
    DROP CONSTRAINT IF EXISTS sensors_tag_name_unique
  `);

  await knex.raw(`
    ALTER TABLE sensors
    ADD CONSTRAINT sensors_plc_id_tag_name_unique UNIQUE (plc_id, tag_name)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.raw(`
    ALTER TABLE sensors
    DROP CONSTRAINT IF EXISTS sensors_plc_id_tag_name_unique
  `);

  await knex.raw(`
    ALTER TABLE sensors
    ADD CONSTRAINT sensors_tag_name_unique UNIQUE (tag_name)
  `);
};
