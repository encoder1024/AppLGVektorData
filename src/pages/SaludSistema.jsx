import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Stack
} from '@mui/material';
import api from '../services/api';

const backgroundImageUrl = new URL('../../ProyectoEjecutivo/EstructuraProyectoPiloto-rev00.jpeg', import.meta.url).href;

const getStatusPresentation = (status) => {
  if (status === 'green') {
    return { color: '#16a34a', label: 'Normal' };
  }
  if (status === 'yellow') {
    return { color: '#d97706', label: 'Atencion' };
  }
  return { color: '#dc2626', label: 'Critico' };
};

const inferStatusFromItems = (items) => {
  const total = items.length;
  const active = items.filter((item) => item?.activo !== false).length;

  if (total === 0) {
    return 'red';
  }
  if (active === total) {
    return 'green';
  }
  return 'yellow';
};

const normalizeRows = (items, fallbackSecondary) =>
  items.map((item) => ({
    primary: item.nombre || item.tag_name || 'Elemento',
    secondary: item.plc_nombre || item.ip_address || fallbackSecondary || 'Sin detalle',
    state: item.activo === false ? 'Inactivo' : 'Activo',
  }));

const findByNameCandidates = (items, field, candidates) => {
  const normalizedCandidates = candidates.map((candidate) => candidate.toUpperCase());
  return (
    items.find((item) => normalizedCandidates.includes(String(item?.[field] || '').toUpperCase())) ||
    items.find((item) =>
      normalizedCandidates.some((candidate) => String(item?.[field] || '').toUpperCase().includes(candidate))
    ) ||
    null
  );
};

const SaludSistema = () => {
  const [plcs, setPlcs] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [actuators, setActuators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComponent, setSelectedComponent] = useState(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      setError('');
      try {
        const [plcsResponse, sensorsResponse, actuatorsResponse] = await Promise.all([
          api.get('/plcs'),
          api.get('/sensors'),
          api.get('/actuators')
        ]);

        setPlcs(plcsResponse.data || []);
        setSensors(sensorsResponse.data || []);
        setActuators(actuatorsResponse.data || []);
      } catch (err) {
        setError('Error al cargar la salud del sistema.');
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  const components = useMemo(() => {
    const zoneASensors = sensors.filter((sensor) => sensor.zona === 'ZONA_A');
    const zoneBSensors = sensors.filter((sensor) => sensor.zona === 'ZONA_B');
    const zoneAActuators = actuators.filter((actuator) => actuator.zona === 'ZONA_A');
    const zoneBActuators = actuators.filter((actuator) => actuator.zona === 'ZONA_B');
    const zoneAPLCs = plcs.filter((plc) => plc.zona === 'ZONA_A');
    const zoneBPLCs = plcs.filter((plc) => plc.zona === 'ZONA_B');
    const pVektor01 =
      findByNameCandidates(zoneAPLCs, 'nombre', ['PVEKTOR01', 'PVECTOR01']) ||
      findByNameCandidates(plcs, 'nombre', ['PVEKTOR01', 'PVECTOR01']);
    const pVektor02 =
      findByNameCandidates(zoneAPLCs, 'nombre', ['PVEKTOR02', 'PVECTOR02']) ||
      findByNameCandidates(plcs, 'nombre', ['PVEKTOR02', 'PVECTOR02']);
    const pVektor02Actuators = zoneAActuators.slice(0, 3);
    const plc01S01 =
      findByNameCandidates(zoneBPLCs, 'nombre', ['PLC01-S01', 'PLC01S01', 'PLC01']) ||
      findByNameCandidates(plcs, 'nombre', ['PLC01-S01', 'PLC01S01', 'PLC01']) ||
      zoneBPLCs[0] ||
      null;
    const sensorModbusCaudal = zoneBSensors.find((sensor) =>
      (sensor.tag_name || '').toUpperCase().includes('CAUDAL')
    ) || zoneBSensors[0] || null;

    return [
      {
        key: 'thermopac-1',
        title: 'Thermopac 1',
        position: { top: '8.5%', left: '22.2%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '20.7%' },
        status: inferStatusFromItems(zoneASensors.slice(0, 1)),
        description: 'Sensor de temperatura del primer thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(0, 1).length }],
        rows: normalizeRows(zoneASensors.slice(0, 1), 'Sector A'),
      },
      {
        key: 'thermopac-2',
        title: 'Thermopac 2',
        position: { top: '8.5%', left: '32.5%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '31.1%' },
        status: inferStatusFromItems(zoneASensors.slice(1, 2)),
        description: 'Sensor de temperatura del segundo thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(1, 2).length }],
        rows: normalizeRows(zoneASensors.slice(1, 2), 'Sector A'),
      },
      {
        key: 'thermopac-3',
        title: 'Thermopac 3',
        position: { top: '8.5%', left: '42.9%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '41.5%' },
        status: inferStatusFromItems(zoneASensors.slice(2, 3)),
        description: 'Sensor de temperatura del tercer thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(2, 3).length }],
        rows: normalizeRows(zoneASensors.slice(2, 3), 'Sector A'),
      },
      {
        key: 'pvektor01',
        title: 'PVektor01',
        position: { top: '8%', left: '53.9%', width: '18%', height: '16%' },
        led: { top: '6.8%', left: '67.5%' },
        status: pVektor01 ? 'green' : 'red',
        description: 'Placa PVektor01 del Sector A. Concentra sensado y comunicaciones locales.',
        metrics: [{ label: 'PLC asociado', value: pVektor01 ? 1 : 0 }],
        rows: normalizeRows(pVektor01 ? [pVektor01] : [], 'Sector A'),
      },
      {
        key: 'pvektor02',
        title: 'PVektor02',
        position: { top: '28%', left: '53.9%', width: '18%', height: '16%' },
        led: { top: '26.8%', left: '67.5%' },
        status: inferStatusFromItems(pVektor02 ? [pVektor02] : []),
        description: 'Placa PVektor02 del Sector A. Controla alarmas y salidas digitales.',
        metrics: [
          { label: 'PLC asociado', value: pVektor02 ? 1 : 0 },
          { label: 'Actuadores asociados', value: pVektor02Actuators.length }
        ],
        rows: normalizeRows(
          [
            ...(pVektor02 ? [pVektor02] : []),
            ...pVektor02Actuators
          ],
          'Sector A'
        ),
      },
      {
        key: 'alarma-roja-1',
        title: 'Alarma Roja 1',
        position: { top: '30.6%', left: '25%', width: '4.5%', height: '8%' },
        led: { top: '28.9%', left: '24.9%' },
        status: inferStatusFromItems(pVektor02Actuators.slice(0, 1)),
        description: 'Salida de alarma/actuacion 1 comandada desde PVektor02.',
        metrics: [{ label: 'Actuadores asociados', value: pVektor02Actuators.slice(0, 1).length }],
        rows: normalizeRows(pVektor02Actuators.slice(0, 1), 'PVektor02'),
      },
      {
        key: 'alarma-roja-2',
        title: 'Alarma Roja 2',
        position: { top: '30.6%', left: '36.7%', width: '4.5%', height: '8%' },
        led: { top: '28.9%', left: '36.6%' },
        status: inferStatusFromItems(pVektor02Actuators.slice(1, 2)),
        description: 'Salida de alarma/actuacion 2 comandada desde PVektor02.',
        metrics: [{ label: 'Actuadores asociados', value: pVektor02Actuators.slice(1, 2).length }],
        rows: normalizeRows(pVektor02Actuators.slice(1, 2), 'PVektor02'),
      },
      {
        key: 'alarma-roja-3',
        title: 'Alarma Roja 3',
        position: { top: '30.6%', left: '45.3%', width: '4.5%', height: '8%' },
        led: { top: '28.9%', left: '45.2%' },
        status: inferStatusFromItems(pVektor02Actuators.slice(2, 3)),
        description: 'Salida de alarma/actuacion 3 comandada desde PVektor02.',
        metrics: [{ label: 'Actuadores asociados', value: pVektor02Actuators.slice(2, 3).length }],
        rows: normalizeRows(pVektor02Actuators.slice(2, 3), 'PVektor02'),
      },
      {
        key: 'switch-a',
        title: 'Switch A',
        position: { top: '28%', left: '80.5%', width: '11%', height: '9%' },
        led: { top: '26.2%', left: '89.5%' },
        status: inferStatusFromItems([pVektor01, pVektor02].filter(Boolean)),
        description: 'Switch industrial del Sector A. Solo conecta las placas PVektor01 y PVektor02.',
        metrics: [{ label: 'Equipos conectados', value: [pVektor01, pVektor02].filter(Boolean).length }],
        rows: normalizeRows([pVektor01, pVektor02].filter(Boolean), 'Switch A'),
      },
      {
        key: 'pc-sistema',
        title: 'PC Sistema',
        position: { top: '47.5%', left: '4%', width: '18%', height: '18%' },
        led: { top: '45%', left: '6.5%' },
        status: plcs.length > 0 ? 'green' : 'yellow',
        description: 'Interfaz HMI, servidor de comunicaciones y base de datos del sistema.',
        metrics: [
          { label: 'PLCs registrados', value: plcs.length },
          { label: 'Sensores registrados', value: sensors.length },
          { label: 'Actuadores registrados', value: actuators.length },
        ],
        rows: [
          { primary: 'Interfaz de Usuario', secondary: 'Frontend React / Dashboard', state: 'Disponible' },
          { primary: 'Servidor de Comunicaciones', secondary: 'Backend / Socket / API', state: 'Disponible' },
          { primary: 'Base de Datos', secondary: 'PostgreSQL / Knex', state: 'Disponible' },
        ],
      },
      {
        key: 'switch-sistemas',
        title: 'Switch Sistemas',
        position: { top: '52%', left: '22%', width: '12%', height: '8%' },
        led: { top: '50%', left: '28.5%' },
        status: plcs.length > 0 ? 'yellow' : 'red',
        description: 'Switch del sistema informatico para concentracion de red del proyecto.',
        metrics: [{ label: 'Enlaces monitoreados', value: 'Pendiente housekeeping' }],
        rows: normalizeRows(plcs, 'Switch Sistemas'),
      },
      {
        key: 'switch-intermedio',
        title: 'Switch Intermedio',
        position: { top: '50.5%', left: '52%', width: '12%', height: '8%' },
        led: { top: '48.5%', left: '59%' },
        status: plcs.length > 1 ? 'yellow' : 'red',
        description: 'Nodo de distribucion entre el sistema informatico y los sectores del piloto.',
        metrics: [{ label: 'PLCs comunicados', value: plcs.length }],
        rows: normalizeRows(plcs, 'Switch Intermedio'),
      },
      {
        key: 'switch-b',
        title: 'Switch B',
        position: { top: '57.5%', left: '72.1%', width: '11%', height: '8%' },
        led: { top: '55.7%', left: '81.1%' },
        status: inferStatusFromItems(plc01S01 ? [plc01S01] : []),
        description: 'Switch industrial del Sector B. El PLC01-S01 se conecta fisicamente a este switch.',
        metrics: [{ label: 'Equipos conectados', value: plc01S01 ? 1 : 0 }],
        rows: normalizeRows(plc01S01 ? [plc01S01] : [], 'Switch B'),
      },
      {
        key: 'sensor-modbus-caudal',
        title: 'Sensor Modbus Caudal',
        position: { top: '64%', left: '53%', width: '7.5%', height: '8%' },
        led: { top: '62.3%', left: '51.9%' },
        status: inferStatusFromItems(sensorModbusCaudal ? [sensorModbusCaudal] : []),
        description: 'Sensor de caudal Modbus del Sector B.',
        metrics: [{ label: 'Sensores asociados', value: sensorModbusCaudal ? 1 : 0 }],
        rows: normalizeRows(sensorModbusCaudal ? [sensorModbusCaudal] : [], 'Sector B'),
      },
      {
        key: 'instrumentacion-sector-b',
        title: 'Instrumentacion de Campo Sector B',
        position: { top: '75.3%', left: '51.7%', width: '12%', height: '19%' },
        led: { top: '73.8%', left: '50%' },
        status: inferStatusFromItems(zoneBSensors),
        description: 'Sensores de caudal y temperatura del Sector B.',
        metrics: [{ label: 'Sensores asociados', value: zoneBSensors.length }],
        rows: normalizeRows(zoneBSensors, 'Sector B'),
      },
      {
        key: 'plc-sector-b',
        title: plc01S01?.nombre || 'PLC01-S01',
        position: { top: '73%', left: '74%', width: '16%', height: '12%' },
        led: { top: '71.2%', left: '90.2%' },
        status: inferStatusFromItems(plc01S01 ? [plc01S01] : []),
        description: 'PLC MODBUS de caudal y volumen de gas del Sector B.',
        metrics: [{ label: 'PLCs asociados', value: plc01S01 ? 1 : 0 }],
        rows: normalizeRows(plc01S01 ? [plc01S01] : [], 'Sector B'),
      },
    ];
  }, [actuators, plcs, sensors]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 3 }}>
        Salud del Sistema
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: '#ffffff' }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Vista operacional del piloto. Cada LED representa un componente individual y cada area clickeable abre el detalle de ese componente.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            sx={{
              position: 'relative',
              width: { xs: '100%', lg: '70%' },
              maxWidth: 980,
              aspectRatio: '591 / 812',
              borderRadius: 3,
              overflow: 'hidden',
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundColor: '#f8fafc'
            }}
          >
            {components.map((component) => {
              const statusPresentation = getStatusPresentation(component.status);

              return (
                <React.Fragment key={component.key}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: component.led.top,
                      left: component.led.left,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: statusPresentation.color,
                      boxShadow: `0 0 0 4px rgba(255,255,255,0.55), 0 0 14px ${statusPresentation.color}`,
                      border: '1px solid rgba(15, 23, 42, 0.25)',
                      zIndex: 2
                    }}
                  />
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedComponent(component)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedComponent(component);
                      }
                    }}
                    sx={{
                      position: 'absolute',
                      ...component.position,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px dashed rgba(15, 23, 42, 0.16)',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        borderColor: statusPresentation.color,
                        boxShadow: `inset 0 0 0 1px ${statusPresentation.color}`
                      }
                    }}
                  />
                </React.Fragment>
              );
            })}
          </Box>
        </Box>
      </Paper>

      <Dialog open={Boolean(selectedComponent)} onClose={() => setSelectedComponent(null)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedComponent?.title}</DialogTitle>
        <DialogContent dividers>
          {selectedComponent && (
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {selectedComponent.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={getStatusPresentation(selectedComponent.status).label}
                  sx={{
                    backgroundColor: getStatusPresentation(selectedComponent.status).color,
                    color: '#ffffff',
                    fontWeight: 'bold'
                  }}
                />
                {selectedComponent.metrics.map((metric) => (
                  <Chip key={metric.label} label={`${metric.label}: ${metric.value}`} variant="outlined" />
                ))}
              </Stack>

              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {selectedComponent.rows.length > 0 ? (
                  selectedComponent.rows.map((row, index) => (
                    <Paper key={`${row.primary}-${index}`} variant="outlined" sx={{ p: 1.5, backgroundColor: '#f8fafc' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{row.primary}</Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        {row.secondary}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        Estado: {row.state}
                      </Typography>
                    </Paper>
                  ))
                ) : (
                  <Typography color="textSecondary">Sin elementos configurados para este componente.</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedComponent(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaludSistema;
