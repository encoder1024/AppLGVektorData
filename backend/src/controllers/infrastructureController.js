import db from '../config/db.js';
import networkMonitor from '../services/networkMonitor.js';

const getNodes = async (req, res) => {
  try {
    const nodes = await db('infrastructure_nodes').select('*').orderBy('id', 'asc');
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener nodos de infraestructura', error: error.message });
  }
};

const createNode = async (req, res) => {
  try {
    const [newNode] = await db('infrastructure_nodes').insert(req.body).returning('*');
    await networkMonitor.refresh();
    res.status(201).json(newNode);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear nodo', error: error.message });
  }
};

const updateNode = async (req, res) => {
  const { id } = req.params;
  try {
    const [updatedNode] = await db('infrastructure_nodes').where({ id }).update(req.body).returning('*');
    await networkMonitor.refresh();
    res.json(updatedNode);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar nodo', error: error.message });
  }
};

const deleteNode = async (req, res) => {
  const { id } = req.params;
  try {
    await db('infrastructure_nodes').where({ id }).del();
    await networkMonitor.refresh();
    res.json({ message: 'Nodo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar nodo', error: error.message });
  }
};

export default { getNodes, createNode, updateNode, deleteNode };
