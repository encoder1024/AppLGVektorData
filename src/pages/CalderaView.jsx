import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, Container, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import CalderaInteractiva from '../components/systems/Caldera';
import baseImage from '../assets/ES_Boiler_Control_base.jpg';
import { PowerSettingsNew as PowerIcon, ArrowBack as BackIcon } from '@mui/icons-material';

const CalderaView = () => {
  const navigate = useNavigate();
  const [isOn, setIsOn] = useState(false);
  const [sensorId, setSensorId] = useState(null);

  // Datos simulados iniciales, se actualizarán con datos reales
  const [datosSensores, setDatosSensores] = useState({
    temperatura: 0,
    presion: 2.5
  });

  useEffect(() => {
    // 1. Buscar el ID del sensor "sensor 1" en PVektor02
    const findSensor = async () => {
      try {
        console.log('[CalderaView] Fetching sensors list...');
        const response = await api.get('/sensors');

        // Busqueda especifica para TEMP001 (ID: 7) en PVektor02
        const sensor = response.data.find(s => {
          return (s.id == 7) || (String(s.tag_name).toUpperCase() === 'TEMP001' && s.plc_id == 2);
        });

        if (sensor) {
          console.log('[CalderaView] Sensor TEMP001 (ID:7) FOUND:', sensor);
          setSensorId(sensor.id);
        } else {

          console.warn('[CalderaView] Sensor 1 NOT FOUND. Available sensors:', response.data.map(s => `${s.tag_name} (ID:${s.id}) on PLC:${s.plc_nombre}`));
        }
      } catch (err) {
        console.error('[CalderaView] Error fetching sensors:', err);
      }
    };

    findSensor();
  }, []);

  useEffect(() => {
    // 2. Conectar WebSocket para actualizaciones en tiempo real
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      console.log('[CalderaView] Socket connected:', socket.id);
    });

    socket.on('sensor_update', (data) => {
      // Loggear el update que llega para comparar IDs y tipos
      if (sensorId) {
        const match = String(data.sensor_id) === String(sensorId);
        if (match) {
          setDatosSensores((prev) => ({
            ...prev,
            temperatura: Number(data.value)
          }));
        }
      }
    });


    return () => {
      console.log('[CalderaView] Disconnecting socket...');
      socket.disconnect();
    };
  }, [sensorId]);

  const handleToggle = () => {
    setIsOn(!isOn);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 3, backgroundColor: '#fdfdfd' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/')} sx={{ mr: 2, bgcolor: '#f1f5f9' }} title="Volver al Dashboard">
              <BackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
              Monitoreo de Caldera
            </Typography>
          </Box>
          <Button
            variant="contained"
            color={isOn ? "error" : "success"}
            startIcon={<PowerIcon />}
            onClick={handleToggle}
            sx={{ px: 3, py: 0.5, borderRadius: 2, fontWeight: 'bold' }}
          >
            {isOn ? "APAGAR" : "ENCENDER"}
          </Button>
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            backgroundColor: '#000',
            minHeight: '350px',
            maxHeight: 'calc(100vh - 200px)'
          }}
        >
          {isOn ? (
            <CalderaInteractiva datosSensores={datosSensores} />
          ) : (
            <img
              src={baseImage}
              alt="Caldera Base"
              style={{
                width: '100%',
                maxWidth: '900px',
                display: 'block',
                opacity: 0.8
              }}
            />
          )}
        </Box>

        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {isOn 
              ? "Sistema en operación - Monitoreo en tiempo real activo." 
              : "Sistema fuera de línea - Presione el botón ENCENDER para iniciar el monitoreo."}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CalderaView;
