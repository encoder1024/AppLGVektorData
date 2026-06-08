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

  // Datos dinámicos actualizados por Socket
  const [datosSensores, setDatosSensores] = useState({
    temperatura: { value: 0, alerts: {} }, // TEMP001 (PVektor02)
    steamTemp: { value: 0, alerts: {} },   // TEMP01 (PLC01-S01)
    steamFlow: { value: 0, alerts: {} },   // CAUD01 (PLC01-S01)
    fuelFlow: { value: 0, alerts: {} },    // CAUD02 (PLC01-S01)
    fuelGas: { value: 0, alerts: {} }      // GAS001 (PLC01-S01)
  });

  const sensorMapping = useRef({
    originalTemp: null,
    steamTemp: null,
    steamFlow: null,
    fuelFlow: null,
    fuelGas: null
  });

  useEffect(() => {
    const findSensors = async () => {
      try {
        const response = await api.get('/sensors');
        const allSensors = response.data;

        // Buscamos los sensores especificos por tag_name y PLC si es necesario
        const findSensor = (tag, plcId) => {
          return allSensors.find(s => 
            String(s.tag_name).toUpperCase() === tag.toUpperCase() && 
            (!plcId || s.plc_id == plcId)
          );
        };

        const mapSensorData = (tag, plcId) => {
          const s = findSensor(tag, plcId);
          if (!s) return { id: null, alerts: {} };
          return {
            id: s.id,
            alerts: {
              alert_high: s.alert_high,
              alert_low: s.alert_low,
              warning_high: s.warning_high,
              warning_low: s.warning_low
            }
          };
        };

        const mapping = {
          originalTemp: mapSensorData('TEMP001', 2),
          steamTemp: mapSensorData('TEMP001', 1).id ? mapSensorData('TEMP001', 1) : mapSensorData('TEMP001'),
          steamFlow: mapSensorData('CAUD01', 1).id ? mapSensorData('CAUD01', 1) : mapSensorData('CAUD01'),
          fuelFlow: mapSensorData('CAUD02', 1).id ? mapSensorData('CAUD02', 1) : mapSensorData('CAUD02'),
          fuelGas: mapSensorData('GAS001', 1).id ? mapSensorData('GAS001', 1) : mapSensorData('GAS001')
        };

        sensorMapping.current = mapping;
        
        // Inicializamos el estado con los limites
        setDatosSensores({
          temperatura: { value: 0, alerts: mapping.originalTemp.alerts },
          steamTemp: { value: 0, alerts: mapping.steamTemp.alerts },
          steamFlow: { value: 0, alerts: mapping.steamFlow.alerts },
          fuelFlow: { value: 0, alerts: mapping.fuelFlow.alerts },
          fuelGas: { value: 0, alerts: mapping.fuelGas.alerts }
        });
      } catch (err) {
        console.error('[CalderaView] Error al mapear sensores:', err);
      }
    };

    findSensors();
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('sensor_update', (data) => {
      const { sensor_id, value } = data;
      
      setDatosSensores((prev) => {
        const mapping = sensorMapping.current;
        const newDatos = { ...prev };

        const updateIfMatch = (key) => {
          if (String(sensor_id) === String(mapping[key]?.id)) {
            newDatos[key] = { ...prev[key], value: Number(value) };
          }
        };

        updateIfMatch('originalTemp');
        updateIfMatch('steamTemp');
        updateIfMatch('steamFlow');
        updateIfMatch('fuelFlow');
        updateIfMatch('fuelGas');
        
        // Para compatibilidad con el modal que usa temperatura
        if (String(sensor_id) === String(mapping.originalTemp?.id)) {
          newDatos.temperatura = { ...prev.temperatura, value: Number(value) };
        }
        
        return newDatos;
      });
    });

    return () => socket.disconnect();
  }, []);

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
