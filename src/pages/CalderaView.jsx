import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Container, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CalderaInteractiva from '../components/systems/Caldera';
import baseImage from '../assets/ES_Boiler_Control_base.jpg';
import { PowerSettingsNew as PowerIcon, ArrowBack as BackIcon } from '@mui/icons-material';

const CalderaView = () => {
  const navigate = useNavigate();
  const [isOn, setIsOn] = useState(false);

  // Datos simulados para los sensores de la caldera
  const [datosSensores, setDatosSensores] = useState({
    temperatura: 65,
    presion: 2.5
  });

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
