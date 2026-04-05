/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  const configs = [
    { key: 'connection_mode', value: JSON.stringify('local') },
    { key: 'db_local_url', value: JSON.stringify('postgresql://user:pass@localhost:5432/industry_db') },
    { key: 'db_remote_url', value: JSON.stringify('postgresql://admin:securepass@cloud-server.com') },
    { key: 'use_remote_db', value: JSON.stringify(false) },
    { key: 'scan_rate_default_ms', value: JSON.stringify(1000) },
    { key: 'company_name', value: JSON.stringify('LG Vektor Data') },
    { key: 'admin_email', value: JSON.stringify('admin@lgvektor.com') },
    { key: 'retention_policy_days', value: JSON.stringify(30) }
  ];

  for (const config of configs) {
    const exists = await knex('app_config').where({ key: config.key }).first();
    if (!exists) {
      await knex('app_config').insert({
        ...config,
        updated_at: knex.fn.now()
      });
      console.log(`✅ Configuración inicial '${config.key}' creada`);
    }
  }
};
