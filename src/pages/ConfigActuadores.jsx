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
  { value: 'PULSADOR_MOMENTANEO', label: 'Pulsador (Momentaneo)' },
  { value: 'DESLIZADOR_ANALOGICO', label: 'Deslizador (Setpoint)' }
];

const dataTypes = ['BOOLEAN', 'INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32'];

const defaultFormData = (plcId = '') => ({
  plc_id: plcId,
  nombre: '',
  descripcion: '',
  activo: true,
  tipo_ui: 'SWITCH_ON_OFF',
  tipo_signal: 'DIGITAL_OUTPUT',
  tipo_dato_plc: 'BOOLEAN',
  direccion_memoria: '',
  min_val: 0,
  max_val: 1
});

const ConfigActuadores = () => {
  const [actuators, setActuators] = useState([]);
  const [plcs, setPlcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentActuator, setCurrentActuator] = useState(null);
  const [formData, setFormData] = useState(defaultFormData());

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
      setFormData({
        ...defaultFormData(plcs[0]?.id || ''),
        ...actuator,
        activo: actuator.activo !== false,
        descripcion: actuator.descripcion || ''
      });
    } else {
      setCurrentActuator(null);
      setFormData(defaultFormData(plcs[0]?.id || ''));
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'activo' ? value === 'true' : value
    }));
  };

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
    if (window.confirm('Eliminar este actuador?')) {
      try {
        await api.delete(`/actuators/${id}`);
        fetchData();
      } catch (err) {
        setError('Error al eliminar');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Configuracion de Actuadores
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
              <TableCell>Estado</TableCell>
              <TableCell>Nombre / PLC</TableCell>
              <TableCell>Interfaz UI</TableCell>
              <TableCell>Descripcion</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : actuators.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No hay actuadores configurados</TableCell></TableRow>
            ) : (
              actuators.map((actuator) => (
                <TableRow key={actuator.id} sx={{ opacity: actuator.activo === false ? 0.5 : 1 }}>
                  <TableCell>
                    <Chip
                      label={actuator.activo === false ? 'OFF' : 'ACTIVO'}
                      color={actuator.activo === false ? 'default' : 'success'}
                      size="small"
                      variant={actuator.activo === false ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{actuator.nombre}</Typography>
                    <Typography variant="caption" color="textSecondary">{actuator.plc_nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<ToggleIcon />}
                      label={uiTypes.find((type) => type.value === actuator.tipo_ui)?.label || actuator.tipo_ui}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{actuator.descripcion || 'Sin descripcion'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpen(actuator)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(actuator.id)}><DeleteIcon fontSize="small" /></IconButton>
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
                  {plcs.map((plc) => <MenuItem key={plc.id} value={plc.id}>{plc.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth name="nombre" label="Nombre del Actuador" value={formData.nombre} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth name="activo" label="Disponible" value={String(formData.activo)} onChange={handleChange} required>
                  <MenuItem value="true">Activo</MenuItem>
                  <MenuItem value="false">Inactivo</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  name="descripcion"
                  label="Descripcion del actuador"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Ej: Arranque de bomba principal, valvula de riego, luz de torre, etc."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth name="tipo_ui" label="Tipo de Control UI" value={formData.tipo_ui} onChange={handleChange} required>
                  {uiTypes.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth name="tipo_dato_plc" label="Tipo de Dato PLC" value={formData.tipo_dato_plc} onChange={handleChange} required>
                  {dataTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="direccion_memoria" label="Direccion / Registro de Escritura" value={formData.direccion_memoria} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth name="min_val" label="Valor Minimo" type="number" value={formData.min_val} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth name="max_val" label="Valor Maximo" type="number" value={formData.max_val} onChange={handleChange} required />
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
