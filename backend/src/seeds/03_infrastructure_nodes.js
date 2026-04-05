/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Solo insertamos si no existen nodos
  const count = await knex('infrastructure_nodes').count('id as cnt').first();
  
  if (parseInt(count.cnt) === 0) {
    await knex('infrastructure_nodes').insert([
      {
        nombre: 'Servidor Control (Host)',
        tipo: 'SERVER',
        ip_address: '127.0.0.1',
        descripcion: 'Computadora principal donde corre el sistema Docker',
        activo: true
      }
    ]);
    console.log('✅ Nodo de Servidor Control creado en infraestructura');
  }
};
