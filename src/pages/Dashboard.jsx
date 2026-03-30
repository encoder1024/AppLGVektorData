import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress, Alert, 
  IconButton, Chip, Stack
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Wifi as WifiIcon, 
  WifiOff as WifiOffIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import GaugeComponent from 'react-gauge-component';
import { io } from 'socket.io-client';
import api from '../services/api';

const Dashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const fetchSensors = async () => {
    try {
      const response = await api.get('/sensors');
      const activeSensors = response.data.filter(s => s.activo);
      setSensors(activeSensors);
      const initialReadings = {};
      activeSensors.forEach(s => initialReadings[s.id] = 0);
      setReadings(initialReadings);
    } catch (err) {
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
    const socket = io('http://localhost:3000');
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('sensor_update', (data) => {
      setReadings(prev => ({ ...prev, [data.sensor_id]: data.value }));
    });
    return () => socket.disconnect();
  }, []);

  // Función para determinar el estado detallado del sensor
  const getSensorStatus = (sensor, value) => {
    if (sensor.alert_high && value >= sensor.alert_high) 
      return { label: 'ALERTA ALTO NIVEL', color: '#ef4444', icon: <ErrorIcon /> };
    if (sensor.alert_low && value <= sensor.alert_low) 
      return { label: 'ALERTA BAJO NIVEL', color: '#ef4444', icon: <ErrorIcon /> };
    if (sensor.warning_high && value >= sensor.warning_high) 
      return { label: 'AVISO ALTO NIVEL', color: '#f59e0b', icon: <WarningIcon /> };
    if (sensor.warning_low && value <= sensor.warning_low) 
      return { label: 'AVISO BAJO NIVEL', color: '#f59e0b', icon: <WarningIcon /> };
    
    return { label: 'SISTEMA NORMAL', color: '#10b981', icon: <CheckIcon /> };
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            HMI Real-Time
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              icon={connected ? <WifiIcon /> : <WifiOffIcon />} 
              label={connected ? "POLLING ACTIVO" : "RECONECTANDO..."} 
              color={connected ? "success" : "error"} 
              variant="outlined" 
              size="small"
            />
            </Box>
            </Box>

        <IconButton onClick={fetchSensors}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {sensors.map((sensor) => {
          const value = readings[sensor.id] ?? 0;
          const status = getSensorStatus(sensor, value);

          return (
            <Grid item xs={12} sm={6} md={4} key={sensor.id}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 0, 
                  overflow: 'hidden', 
                  borderRadius: 2,
                  borderTop: `8px solid ${status.color}`, // Borde más grueso
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Cabecera de Estado */}
                <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>{sensor.tag_name}</Typography>
                    <Typography variant="caption" color="textSecondary">{sensor.plc_nombre}</Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: status.color }}>
                    {status.icon}
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{status.label}</Typography>
                  </Stack>
                </Box>

                {/* Instrumento */}
                <Box sx={{ height: 200, px: 2 }}>
                  <GaugeComponent
                    value={value}
                    type="grafana"
                    minValue={sensor.min_range || 0}
                    maxValue={sensor.max_range || 100}
                    arc={{
                      width: 0.2,
                      padding: 0.02,
                      cornerRadius: 1,
                      // Define subArcs based on sensor ranges and status colors
                      subArcs: [
                        { limit: sensor.alert_low || sensor.min_range, color: '#ef4444' }, // Red zone for low alert
                        { limit: sensor.warning_low || sensor.min_range, color: '#f59e0b' }, // Orange zone for low warning
                        { limit: sensor.warning_high || sensor.max_range, color: '#10b981' }, // Green zone for normal range
                        { limit: sensor.alert_high || sensor.max_range, color: '#ef4444' }  // Red zone for high alert (this will be the final arc up to max_range if alert_high is defined)
                      ].filter(arc => arc.limit !== undefined && arc.limit !== null) // Filter out undefined limits
                       .sort((a, b) => a.limit - b.limit) // Sort arcs by limit
                    }}
                    labels={{
                      valueLabel: {
                        style: { fontSize: "35px", fill: status.color, fontWeight: 'bold' }, // Value label color matches status
                        formatTextValue: val => `${val.toFixed(1)} ${sensor.unidad_medida || ''}`
                      }
                    }}
                  />
                </Box>

                {/* Footer Técnico */}
                <Box sx={{ bgcolor: '#f8fafc', px: 3, py: 1, borderTop: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
                    Reg: {sensor.direccion_memoria} | {sensor.tipo_dato_plc}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Dashboard;
