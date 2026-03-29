import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Chip, Grid, Tabs, Tab, Divider
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../services/api';

const signalTypes = ['ANALOG_INPUT', 'ANALOG_OUTPUT', 'DIGITAL_INPUT', 'DIGITAL_OUTPUT'];
const dataTypes = ['INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'BOOLEAN'];

// Componente para manejar el contenido de cada Tab
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const instrumentTypes = [
  { value: 'GAUGE_RADIAL', label: 'Gauge Radial (Reloj)' },
  { value: 'GAUGE_LINEAR', label: 'Barra Progresiva' },
  { value: 'TERMOMETRO_SIMPLE', label: 'Termómetro SVG Simple' },
  { value: 'TERMOMETRO_DETALLADO', label: 'Termómetro SVG Industrial' },
  { value: 'NIVEL_TANQUE', label: 'Tanque de Líquido' },
  { value: 'VALOR_DIGITAL', label: 'Display Digital (Texto)' }
];

const ConfigSensores = () => {
  const [sensors, setSensors] = useState([]);
  const [plcs, setPlcs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentSensor, setCurrentSensor] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  const [formData, setFormData] = useState({
    plc_id: '',
    tag_name: '',
    tipo_signal: 'ANALOG_INPUT',
    tipo_dato_plc: 'INT16',
    direccion_memoria: '',
    unidad_medida: '',
    calibration_profile_id: '',
    tipo_instrumento: 'GAUGE_RADIAL',
    min_range: 0,
    max_range: 100,
    warning_low: '',
    warning_high: '',
    alert_low: '',
    alert_high: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSensors, resPlcs, resProfiles] = await Promise.all([
        api.get('/sensors'),
        api.get('/plcs'),
        api.get('/calibration')
      ]);
      setSensors(resSensors.data);
      setPlcs(resPlcs.data);
      setProfiles(resProfiles.data);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpen = (sensor = null) => {
    setTabValue(0); // Reset a la primera tab
    if (sensor) {
      setCurrentSensor(sensor);
      const cleanedData = { ...sensor };
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === null) cleanedData[key] = '';
      });
      setFormData(cleanedData);
    } else {
      setCurrentSensor(null);
      setFormData({
        plc_id: plcs[0]?.id || '',
        tag_name: '', tipo_signal: 'ANALOG_INPUT', tipo_dato_plc: 'INT16',
        direccion_memoria: '', unidad_medida: '', calibration_profile_id: '',
        min_range: 0, max_range: 100, warning_low: '', warning_high: '',
        alert_low: '', alert_high: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setError(''); };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submissionData = { ...formData };
    ['warning_low', 'warning_high', 'alert_low', 'alert_high', 'calibration_profile_id'].forEach(key => {
      if (submissionData[key] === '') submissionData[key] = null;
    });

    try {
      if (currentSensor) {
        await api.put(`/sensors/${currentSensor.id}`, submissionData);
      } else {
        await api.post('/sensors', submissionData);
      }
      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar sensor');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este sensor?')) {
      try {
        await api.delete(`/sensors/${id}`);
        fetchData();
      } catch (err) { setError('Error al eliminar'); }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Caja de Ajustes</Typography>
        <Box>
          <IconButton onClick={fetchData} sx={{ mr: 1 }}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Nuevo Sensor</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Tag / PLC</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Calibración</TableCell>
              <TableCell>Rangos / Alertas</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : (
              sensors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{s.tag_name}</Typography>
                    <Typography variant="caption" color="textSecondary">{s.plc_nombre}</Typography>
                  </TableCell>
                  <TableCell>{s.direccion_memoria} ({s.tipo_dato_plc})</TableCell>
                  <TableCell>{s.unidad_medida}</TableCell>
                  <TableCell>{s.perfil_nombre || 'Directo'}</TableCell>
                  <TableCell>
                    <Typography variant="caption">R: {s.min_range}-{s.max_range}</Typography><br/>
                    {s.alert_high && <Chip label={`A: ${s.alert_high}`} size="small" color="error" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(s)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{currentSensor ? 'Configurar Sensor' : 'Nuevo Sensor'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ minHeight: 400 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="sensor tabs">
                <Tab label="Identificación" />
                <Tab label="Calibración y Visualización" />
                <Tab label="Niveles de Alerta" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth name="plc_id" label="PLC Destino" value={formData.plc_id} onChange={handleChange} required>
                    {plcs.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="tag_name" label="Tag Name (ID Sensor)" value={formData.tag_name} onChange={handleChange} required />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select fullWidth name="tipo_signal" label="Tipo de Señal" value={formData.tipo_signal} onChange={handleChange} required>
                    {signalTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select fullWidth name="tipo_dato_plc" label="Tipo de Dato PLC" value={formData.tipo_dato_plc} onChange={handleChange} required>
                    {dataTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth name="direccion_memoria" label="Registro/Dirección" value={formData.direccion_memoria} onChange={handleChange} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="unidad_medida" label="Unidad de Medida (ej: °C, Bar)" value={formData.unidad_medida} onChange={handleChange} />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    select 
                    fullWidth 
                    name="tipo_instrumento" 
                    label="Visualización SVG" 
                    value={formData.tipo_instrumento} 
                    onChange={handleChange}
                    required
                  >
                    {instrumentTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    select 
                    fullWidth 
                    name="calibration_profile_id" 
                    label="Motor de Calibración" 
                    value={formData.calibration_profile_id} 
                    onChange={handleChange}
                  >
                    <MenuItem value="">Ninguno (Directo)</MenuItem>
                    {profiles.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                
                <Grid item xs={12}><Divider sx={{ opacity: 0.5 }}>Límites de Escala</Divider></Grid>

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="min_range" label="Mínimo Gráfico" type="number" value={formData.min_range} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth name="max_range" label="Máximo Gráfico" type="number" value={formData.max_range} onChange={handleChange} />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom color="warning.main">Avisos Preventivos</Typography>
                  <TextField fullWidth name="warning_low" label="Umbral Bajo" type="number" value={formData.warning_low} onChange={handleChange} sx={{ mb: 2 }} />
                  <TextField fullWidth name="warning_high" label="Umbral Alto" type="number" value={formData.warning_high} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom color="error.main">Alertas Críticas</Typography>
                  <TextField fullWidth name="alert_low" label="Umbral Bajo" type="number" value={formData.alert_low} onChange={handleChange} sx={{ mb: 2 }} />
                  <TextField fullWidth name="alert_high" label="Umbral Alto" type="number" value={formData.alert_high} onChange={handleChange} />
                </Grid>
              </Grid>
            </TabPanel>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary" size="large">Guardar Ajustes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ConfigSensores;
