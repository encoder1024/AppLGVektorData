import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Grid
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  ToggleOn as ToggleIcon
} from '@mui/icons-material';
import api from '../services/api';

const uiTypes = [
  { value: 'SWITCH_ON_OFF', label: 'Interruptor ON/OFF' },
  { value: 'SELECTOR_MODO', label: 'Selector de Modo' },
  { value: 'PULSADOR_MOMENTANEO', label: 'Pulsador (Momentáneo)' },
  { value: 'DESLIZADOR_ANALOGICO', label: 'Deslizador (Setpoint)' }
];

const dataTypes = ['BOOLEAN', 'INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32'];

const ConfigActuadores = () => {
  const [actuators, setActuators] = useState([]);
  const [plcs, setPlcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentActuator, setCurrentActuator] = useState(null);
  
  const [formData, setFormData] = useState({
    plc_id: '',
    nombre: '',
    tipo_ui: 'SWITCH_ON_OFF',
    tipo_signal: 'DIGITAL_OUTPUT',
    tipo_dato_plc: 'BOOLEAN',
    direccion_memoria: '',
    min_val: 0,
    max_val: 1
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resActuators, resPlcs] = await Promise.all([
        api.get('/actuators'),
        api.get('/plcs')
      ]);
      setActuators(resActuators.data);
      setPlcs(resPlcs.data);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpen = (actuator = null) => {
    if (actuator) {
      setCurrentActuator(actuator);
      setFormData(actuator);
    } else {
      setCurrentActuator(null);
      setFormData({
        plc_id: plcs[0]?.id || '',
        nombre: '', tipo_ui: 'SWITCH_ON_OFF', tipo_signal: 'DIGITAL_OUTPUT',
        tipo_dato_plc: 'BOOLEAN', direccion_memoria: '', min_val: 0, max_val: 1
      });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setError(''); };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentActuator) {
        await api.put(`/actuators/${currentActuator.id}`, formData);
      } else {
        await api.post('/actuators', formData);
      }
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar actuador');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este actuador?')) {
      try {
        await api.delete(`/actuators/${id}`);
        fetchData();
      } catch (err) { setError('Error al eliminar'); }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Configuración de Actuadores
        </Typography>
        <Box>
          <IconButton onClick={fetchData} sx={{ mr: 1 }}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Nuevo Actuador
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Nombre / PLC</TableCell>
              <TableCell>Interfaz UI</TableCell>
              <TableCell>Dirección PLC</TableCell>
              <TableCell>Rango</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : actuators.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No hay actuadores configurados</TableCell></TableRow>
            ) : (
              actuators.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{a.nombre}</Typography>
                    <Typography variant="caption" color="textSecondary">{a.plc_nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={<ToggleIcon />} 
                      label={uiTypes.find(t => t.value === a.tipo_ui)?.label || a.tipo_ui} 
                      size="small" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>{a.direccion_memoria} ({a.tipo_dato_plc})</TableCell>
                  <TableCell>{a.min_val} - {a.max_val}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpen(a)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{currentActuator ? 'Editar Actuador' : 'Nuevo Actuador'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField select fullWidth name="plc_id" label="PLC Destino" value={formData.plc_id} onChange={handleChange} required>
                  {plcs.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="nombre" label="Nombre del Actuador" value={formData.nombre} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth name="tipo_ui" label="Tipo de Control UI" value={formData.tipo_ui} onChange={handleChange} required>
                  {uiTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth name="tipo_dato_plc" label="Tipo de Dato PLC" value={formData.tipo_dato_plc} onChange={handleChange} required>
                  {dataTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="direccion_memoria" label="Dirección / Registro de Escritura" value={formData.direccion_memoria} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth name="min_val" label="Valor Mínimo" type="number" value={formData.min_val} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth name="max_val" label="Valor Máximo" type="number" value={formData.max_val} onChange={handleChange} required />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar Actuador</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ConfigActuadores;
