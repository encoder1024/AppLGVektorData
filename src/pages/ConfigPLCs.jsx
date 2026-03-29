import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../services/api';

const brands = ['SIEMENS', 'SCHNEIDER', 'ALLEN_BRADLEY', 'DELTA', 'ARDUINO', 'OTHER'];
const protocols = ['MODBUS_TCP', 'S7', 'ETHERNET_IP', 'OPC_UA', 'MQTT'];

const ConfigPLCs = () => {
  const [plcs, setPlcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentPlc, setCurrentPlc] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    marca: 'SIEMENS',
    protocolo: 'S7',
    ip_address: '',
    puerto: 102,
    unidad_id: 1,
    scan_rate_ms: 1000
  });

  const fetchPLCs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/plcs');
      setPlcs(response.data);
    } catch (err) {
      setError('Error al cargar PLCs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPLCs();
  }, []);

  const handleOpen = (plc = null) => {
    if (plc) {
      setCurrentPlc(plc);
      setFormData(plc);
    } else {
      setCurrentPlc(null);
      setFormData({
        nombre: '', marca: 'SIEMENS', protocolo: 'S7', 
        ip_address: '', puerto: 102, unidad_id: 1, scan_rate_ms: 1000
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentPlc) {
        await api.put(`/plcs/${currentPlc.id}`, formData);
      } else {
        await api.post('/plcs', formData);
      }
      fetchPLCs();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar PLC');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este PLC?')) {
      try {
        await api.delete(`/plcs/${id}`);
        fetchPLCs();
      } catch (err) {
        setError('Error al eliminar PLC');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Configuración de PLCs
        </Typography>
        <Box>
          <IconButton onClick={fetchPLCs} sx={{ mr: 1 }}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Nuevo PLC
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Marca / Protocolo</TableCell>
              <TableCell>IP / Puerto</TableCell>
              <TableCell>Scan Rate</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : plcs.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No hay PLCs configurados</TableCell></TableRow>
            ) : (
              plcs.map((plc) => (
                <TableRow key={plc.id}>
                  <TableCell sx={{ fontWeight: 'medium' }}>{plc.nombre}</TableCell>
                  <TableCell>
                    <Chip label={plc.marca} size="small" sx={{ mr: 0.5 }} />
                    <Chip label={plc.protocolo} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{plc.ip_address}:{plc.puerto}</TableCell>
                  <TableCell>{plc.scan_rate_ms}ms</TableCell>
                  <TableCell>
                    <Chip 
                      label={plc.activo ? 'Activo' : 'Inactivo'} 
                      color={plc.activo ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpen(plc)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(plc.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Creación/Edición */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{currentPlc ? 'Editar PLC' : 'Nuevo PLC'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <TextField
                fullWidth name="nombre" label="Nombre del Dispositivo"
                value={formData.nombre} onChange={handleChange} required
                sx={{ gridColumn: 'span 2' }}
              />
              <TextField
                select fullWidth name="marca" label="Marca"
                value={formData.marca} onChange={handleChange} required
              >
                {brands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth name="protocolo" label="Protocolo"
                value={formData.protocolo} onChange={handleChange} required
              >
                {protocols.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField
                fullWidth name="ip_address" label="Dirección IP"
                value={formData.ip_address} onChange={handleChange} required
              />
              <TextField
                fullWidth name="puerto" label="Puerto" type="number"
                value={formData.puerto} onChange={handleChange} required
              />
              <TextField
                fullWidth name="unidad_id" label="Unidad ID / Slave ID" type="number"
                value={formData.unidad_id} onChange={handleChange} required
              />
              <TextField
                fullWidth name="scan_rate_ms" label="Scan Rate (ms)" type="number"
                value={formData.scan_rate_ms} onChange={handleChange} required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ConfigPLCs;
