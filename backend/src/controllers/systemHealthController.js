import systemHealthService from '../services/systemHealthService.js';

const getLatestSystemHealth = async (req, res) => {
  try {
    const payload = await systemHealthService.getLatestSnapshotSummary();
    res.json(payload);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener la salud del sistema',
      error: error.message
    });
  }
};

export default { getLatestSystemHealth };
