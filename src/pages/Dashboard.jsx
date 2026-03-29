import React from 'react';
import { Typography, Grid, Paper, Box } from '@mui/material';

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
        HMI Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Monitoreo en tiempo real de procesos industriales.
      </Typography>

      <Grid container spacing={3}>
        {/* Placeholder para los Gauges de la Etapa 4 */}
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper sx={{ p: 4, textAlign: 'center', height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" color="textSecondary">Sensor {i}</Typography>
              <Typography variant="h3">--</Typography>
              <Typography variant="caption">Esperando conexión PLC...</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
