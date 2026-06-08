import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, CircularProgress, Grid, Divider, Tooltip, Chip
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  Functions as FunctionsIcon
} from '@mui/icons-material';
import api from '../services/api';

const formulaTypes = [
  { value: 'POLYNOMIAL', label: 'Polinomio General (c4x⁴ + ... + c0)' },
  { value: 'LINEAR_SCALE', label: 'Escalado Lineal (mx + b)' },
  { value: 'LOGARITHMIC', label: 'Logarítmica Natural (c0 + c1 * ln(x + c2))' },
  { value: 'C_TO_F', label: 'Celsius a Fahrenheit' },
  { value: 'F_TO_C', label: 'Fahrenheit a Celsius' },
  { value: 'PSI_TO_BAR', label: 'PSI a Bar' },
  { value: 'BAR_TO_PSI', label: 'Bar a PSI' }
];

const ConfigCalibration = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_formula: 'LINEAR_SCALE',
    c0: 0,
    c1: 1,
    c2: 0,
    c3: 0,
    c4: 0,
    descripcion: ''
  });

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/calibration');
      setProfiles(response.data);
    } catch (err) {
      setError('Error al cargar perfiles de calibración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleOpen = (profile = null) => {
    if (profile) {
      setCurrentProfile(profile);
      setFormData(profile);
    } else {
      setCurrentProfile(null);
      setFormData({
        nombre: '', tipo_formula: 'LINEAR_SCALE',
        c0: 0, c1: 1, c2: 0, c3: 0, c4: 0, descripcion: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setError(''); };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentProfile) {
        await api.put(`/calibration/${currentProfile.id}`, formData);
      } else {
        await api.post('/calibration', formData);
      }
      fetchProfiles();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar perfil');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este perfil? Si está en uso por algún sensor, la operación fallará por seguridad.')) {
      try {
        await api.delete(`/calibration/${id}`);
        fetchProfiles();
      } catch (err) {
        setError('Error al eliminar: Es probable que el perfil esté asignado a un sensor activo.');
      }
    }
  };

  const isPolynomial = formData.tipo_formula === 'POLYNOMIAL' || formData.tipo_formula === 'LINEAR_SCALE';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Perfiles de Calibración
        </Typography>
        <Box>
          <IconButton onClick={fetchProfiles} sx={{ mr: 1 }}><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Nuevo Perfil
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
            <TableRow>
              <TableCell>Nombre / Descripción</TableCell>
              <TableCell>Tipo de Conversión</TableCell>
              <TableCell>Ecuación / Coeficientes</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : profiles.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">No hay perfiles definidos</TableCell></TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{p.nombre}</Typography>
                    <Typography variant="caption" color="textSecondary">{p.descripcion || 'Sin descripción'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={<FunctionsIcon />} 
                      label={formulaTypes.find(f => f.value === p.tipo_formula)?.label || p.tipo_formula} 
                      variant="outlined" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {p.tipo_formula === 'POLYNOMIAL' ? (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        y = {p.c4}x⁴ + {p.c3}x³ + {p.c2}x² + {p.c1}x + {p.c0}
                      </Typography>
                    ) : p.tipo_formula === 'LINEAR_SCALE' ? (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        y = {p.c1}x + {p.c0}
                      </Typography>
                    ) : p.tipo_formula === 'LOGARITHMIC' ? (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        y = {p.c0} + {p.c1} * ln(x + {p.c2})
                      </Typography>
                    ) : (
                      <Typography variant="caption">Fórmula Estándar Industrial</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleOpen(p)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{currentProfile ? 'Editar Perfil' : 'Nuevo Perfil de Calibración'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField 
                  fullWidth name="nombre" label="Nombre del Perfil" 
                  value={formData.nombre} onChange={handleChange} required 
                  placeholder="Ej: Sensor Presión 0-10 Bar"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  select fullWidth name="tipo_formula" label="Tipo de Fórmula / Conversión" 
                  value={formData.tipo_formula} onChange={handleChange} required
                >
                  {formulaTypes.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                </TextField>
              </Grid>

              {(isPolynomial || formData.tipo_formula === 'LOGARITHMIC') && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      {formData.tipo_formula === 'LOGARITHMIC' ? 'Parámetros Logarítmicos' : 'Coeficientes del Polinomio'}
                    </Divider>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField 
                      fullWidth name="c1" 
                      label={formData.tipo_formula === 'LOGARITHMIC' ? 'Escala (c1)' : 'Pendiente (c1/m)'} 
                      type="number" value={formData.c1} onChange={handleChange} required 
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField 
                      fullWidth name="c0" 
                      label={formData.tipo_formula === 'LOGARITHMIC' ? 'Offset (c0)' : 'Offset (c0/b)'} 
                      type="number" value={formData.c0} onChange={handleChange} required 
                    />
                  </Grid>
                  {(formData.tipo_formula === 'POLYNOMIAL' || formData.tipo_formula === 'LOGARITHMIC') && (
                    <Grid item xs={6} sm={4}>
                      <TextField 
                        fullWidth name="c2" 
                        label={formData.tipo_formula === 'LOGARITHMIC' ? 'Despl. X (c2)' : 'Cuadrático (c2)'} 
                        type="number" value={formData.c2} onChange={handleChange} required 
                      />
                    </Grid>
                  )}
                  {formData.tipo_formula === 'POLYNOMIAL' && (
                    <>
                      <Grid item xs={6} sm={4}>
                        <TextField fullWidth name="c3" label="Cúbico (c3)" type="number" value={formData.c3} onChange={handleChange} required />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <TextField fullWidth name="c4" label="Cuártico (c4)" type="number" value={formData.c4} onChange={handleChange} required />
                      </Grid>
                    </>
                  )}
                </>
              )}

              <Grid item xs={12}>
                <TextField 
                  fullWidth name="descripcion" label="Descripción / Notas Técnicas" 
                  multiline rows={2} value={formData.descripcion} onChange={handleChange} 
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar Perfil</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ConfigCalibration;
