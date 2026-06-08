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
import { io } from 'socket.io-client';
import api from '../services/api';

const backgroundImageUrl = new URL('../assets/EstructuraProyectoPiloto-rev00.jpeg', import.meta.url).href;

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

const parseActuatorState = (action) => {
  if (!action) {
    return false;
  }

  const details = action.details || {};
  const candidateValue = [
    action.state,
    action.value,
    details.newValue,
    details.value,
    details.state,
    details.new_state,
    details.targetValue,
    details.target_value,
    details.output,
    details.enabled
  ].find((value) => value !== undefined && value !== null);

  const numericValue =
    typeof candidateValue === 'number'
      ? candidateValue
      : typeof candidateValue === 'string' && candidateValue.trim() !== '' && !Number.isNaN(Number(candidateValue))
        ? Number(candidateValue)
        : null;

  const normalizedText = String(candidateValue ?? action.action_type ?? '')
    .trim()
    .toUpperCase();

  return (
    candidateValue === true ||
    numericValue === 1 ||
    ['ON', 'TRUE', 'OPEN', 'START', 'ENABLE', 'ENABLED', 'HIGH'].includes(normalizedText) ||
    normalizedText.includes('PULSE')
  );
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

const findActuatorByCandidates = (items, plcCandidates, actuatorCandidates) => {
  const normalizedPlcCandidates = plcCandidates.map((candidate) => candidate.toUpperCase());
  const normalizedActuatorCandidates = actuatorCandidates.map((candidate) => candidate.toUpperCase());

  return (
    items.find((item) => {
      const actuatorName = String(item?.nombre || '').toUpperCase();
      const plcName = String(item?.plc_nombre || '').toUpperCase();
      const matchesActuator = normalizedActuatorCandidates.includes(actuatorName);
      const matchesPlc = normalizedPlcCandidates.some(
        (candidate) => plcName === candidate || plcName.includes(candidate)
      );
      return matchesActuator && matchesPlc;
    }) ||
    items.find((item) => {
      const actuatorName = String(item?.nombre || '').toUpperCase();
      return normalizedActuatorCandidates.includes(actuatorName);
    }) ||
    null
  );
};

const getWorstStatus = (statuses, fallback = 'red') => {
  if (statuses.length === 0) {
    return fallback;
  }
  if (statuses.includes('red')) {
    return 'red';
  }
  if (statuses.includes('yellow')) {
    return 'yellow';
  }
  return 'green';
};

const MetricBar = ({ label, value, unit = '%', subtitle }) => {
  const numericValue = parseFloat(value) || 0;
  let color = '#16a34a'; // green
  if (numericValue > 85) {
    color = '#dc2626'; // red
  } else if (numericValue > 70) {
    color = '#d97706'; // yellow
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{value}{unit}</Typography>
      </Box>
      <Box sx={{ width: '100%', height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${Math.min(numericValue, 100)}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.5s ease-in-out'
          }}
        />
      </Box>
      {subtitle && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

const formatSnapshotValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const SaludSistema = () => {
  const [plcs, setPlcs] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [actuators, setActuators] = useState([]);
  const [latestActuatorActions, setLatestActuatorActions] = useState({});
  const [healthSnapshotTime, setHealthSnapshotTime] = useState(null);
  const [healthSnapshots, setHealthSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComponent, setSelectedComponent] = useState(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      setError('');
      try {
        const [plcsResponse, sensorsResponse, actuatorsResponse, actuatorActionsResponse, healthResponse] = await Promise.all([
          api.get('/plcs'),
          api.get('/sensors'),
          api.get('/actuators'),
          api.get('/actuator-actions'),
          api.get('/system-health/latest')
        ]);

        const lastActionByActuator = {};
        (actuatorActionsResponse.data || []).forEach((action) => {
          if (!action.actuator_id || lastActionByActuator[action.actuator_id]) {
            return;
          }
          lastActionByActuator[action.actuator_id] = action;
        });

        setPlcs(plcsResponse.data || []);
        setSensors(sensorsResponse.data || []);
        setActuators(actuatorsResponse.data || []);
        setLatestActuatorActions(lastActionByActuator);
        setHealthSnapshotTime(healthResponse.data?.snapshot_time || null);
        setHealthSnapshots(healthResponse.data?.snapshots || []);
      } catch (err) {
        setError('Error al cargar la salud del sistema.');
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  const healthSnapshotMap = useMemo(
    () =>
      Object.fromEntries(
        healthSnapshots.map((snapshot) => [`${snapshot.component_type}:${snapshot.component_id}`, snapshot])
      ),
    [healthSnapshots]
  );

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('actuator_update', (data) => {
      setLatestActuatorActions((prev) => ({
        ...prev,
        [data.actuator_id]: {
          actuator_id: data.actuator_id,
          action_type: 'SET_STATE',
          timestamp: data.time,
          details: {
            state: data.state,
            value: data.value
          }
        }
      }));
    });

    return () => socket.disconnect();
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
    const alarmaRoja1 = [
      findActuatorByCandidates(zoneAActuators, ['PVEKTOR01', 'PVECTOR01'], ['ACT01'])
    ].filter(Boolean);
    const alarmaRoja2 = [
      findActuatorByCandidates(zoneAActuators, ['PVEKTOR01', 'PVECTOR01'], ['ACT02'])
    ].filter(Boolean);
    const alarmaRoja3 = [
      findActuatorByCandidates(zoneAActuators, ['PVEKTOR01', 'PVECTOR01'], ['ACT03'])
    ].filter(Boolean);
    const pVektor01Actuators = [...alarmaRoja1, ...alarmaRoja2, ...alarmaRoja3];
    const getActuatorSignalStatus = (actuator) => {
      if (!actuator) {
        return 'red';
      }
      return parseActuatorState(latestActuatorActions[actuator.id]) ? 'green' : 'red';
    };
    const plc01S01 =
      findByNameCandidates(zoneBPLCs, 'nombre', ['PLC01-S01', 'PLC01S01', 'PLC01']) ||
      findByNameCandidates(plcs, 'nombre', ['PLC01-S01', 'PLC01S01', 'PLC01']) ||
      zoneBPLCs[0] ||
      null;
    const instrumentacionSectorBSensors = zoneBSensors.filter((sensor) =>
      ['CAUD02', 'GAS001'].includes(String(sensor.tag_name || '').toUpperCase())
    );
    const sensorModbusCaudalSensors = zoneBSensors.filter(
      (sensor) =>
        !instrumentacionSectorBSensors.some((assignedSensor) => assignedSensor.id === sensor.id)
    );
    const getSnapshotStatus = (componentType, componentId) =>
      healthSnapshotMap[`${componentType}:${componentId}`]?.status || null;
    const buildSnapshotEntries = (sources) =>
      sources
        .map(({ componentType, item, label }) => {
          if (!item?.id) {
            return null;
          }
          const snapshot = healthSnapshotMap[`${componentType}:${item.id}`];
          if (!snapshot) {
            return null;
          }
          return {
            label: label || item.nombre || item.tag_name || snapshot.component_name,
            snapshot
          };
        })
        .filter(Boolean);
    const inferStatusFromSnapshots = (componentType, items, fallbackStatus) => {
      const snapshotStatuses = items
        .map((item) => (item?.id ? getSnapshotStatus(componentType, item.id) : null))
        .filter(Boolean);
      return snapshotStatuses.length > 0 ? getWorstStatus(snapshotStatuses, fallbackStatus) : fallbackStatus;
    };

    return [
      {
        key: 'thermopac-1',
        title: 'Thermopac 1',
        position: { top: '8.5%', left: '22.2%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '20.7%' },
        status: inferStatusFromSnapshots('SENSOR', zoneASensors.slice(0, 1), inferStatusFromItems(zoneASensors.slice(0, 1))),
        description: 'Sensor de temperatura del primer thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(0, 1).length }],
        rows: normalizeRows(zoneASensors.slice(0, 1), 'Sector A'),
        snapshotEntries: buildSnapshotEntries(zoneASensors.slice(0, 1).map((sensor) => ({ componentType: 'SENSOR', item: sensor }))),
      },
      {
        key: 'thermopac-2',
        title: 'Thermopac 2',
        position: { top: '8.5%', left: '32.5%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '31.1%' },
        status: inferStatusFromSnapshots('SENSOR', zoneASensors.slice(1, 2), inferStatusFromItems(zoneASensors.slice(1, 2))),
        description: 'Sensor de temperatura del segundo thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(1, 2).length }],
        rows: normalizeRows(zoneASensors.slice(1, 2), 'Sector A'),
        snapshotEntries: buildSnapshotEntries(zoneASensors.slice(1, 2).map((sensor) => ({ componentType: 'SENSOR', item: sensor }))),
      },
      {
        key: 'thermopac-3',
        title: 'Thermopac 3',
        position: { top: '8.5%', left: '42.9%', width: '7%', height: '18%' },
        led: { top: '7.5%', left: '41.5%' },
        status: inferStatusFromSnapshots('SENSOR', zoneASensors.slice(2, 3), inferStatusFromItems(zoneASensors.slice(2, 3))),
        description: 'Sensor de temperatura del tercer thermopac del Sector A.',
        metrics: [{ label: 'Sensores asociados', value: zoneASensors.slice(2, 3).length }],
        rows: normalizeRows(zoneASensors.slice(2, 3), 'Sector A'),
        snapshotEntries: buildSnapshotEntries(zoneASensors.slice(2, 3).map((sensor) => ({ componentType: 'SENSOR', item: sensor }))),
      },
      {
        key: 'pvektor02',
        title: 'PVektor02',
        position: { top: '8%', left: '53.9%', width: '18%', height: '16%' },
        led: { top: '6.8%', left: '67.5%' },
        status: getWorstStatus(
          [
            ...(pVektor02 ? [getSnapshotStatus('PLC', pVektor02.id)] : []),
            ...zoneASensors.slice(0, 3).map((sensor) => getSnapshotStatus('SENSOR', sensor.id)).filter(Boolean)
          ],
          inferStatusFromItems([
            ...(pVektor02 ? [pVektor02] : []),
            ...zoneASensors.slice(0, 3)
          ])
        ),
        description: 'Placa PVektor02 del Sector A. Concentra los tres sensores de temperatura thermopac.',
        metrics: [
          { label: 'PLC asociado', value: pVektor02 ? 1 : 0 },
          { label: 'Sensores asociados', value: zoneASensors.slice(0, 3).length }
        ],
        rows: normalizeRows(
          [
            ...(pVektor02 ? [pVektor02] : []),
            ...zoneASensors.slice(0, 3)
          ],
          'Sector A'
        ),
        snapshotEntries: buildSnapshotEntries([
          ...(pVektor02 ? [{ componentType: 'PLC', item: pVektor02 }] : []),
          ...zoneASensors.slice(0, 3).map((sensor) => ({ componentType: 'SENSOR', item: sensor }))
        ]),
      },
      {
        key: 'pvektor01',
        title: 'PVektor01',
        position: { top: '28%', left: '53.9%', width: '18%', height: '16%' },
        led: { top: '26.8%', left: '67.5%' },
        status: getWorstStatus(
          [
            ...(pVektor01 ? [getSnapshotStatus('PLC', pVektor01.id)] : []),
            ...pVektor01Actuators.map((actuator) => getSnapshotStatus('ACTUATOR', actuator.id)).filter(Boolean)
          ],
          inferStatusFromItems([
            ...(pVektor01 ? [pVektor01] : []),
            ...pVektor01Actuators
          ])
        ),
        description: 'Placa PVektor01 del Sector A. Controla alarmas y salidas digitales.',
        metrics: [
          { label: 'PLC asociado', value: pVektor01 ? 1 : 0 },
          { label: 'Actuadores asociados', value: pVektor01Actuators.length }
        ],
        rows: normalizeRows(
          [
            ...(pVektor01 ? [pVektor01] : []),
            ...pVektor01Actuators
          ],
          'Sector A'
        ),
        snapshotEntries: buildSnapshotEntries([
          ...(pVektor01 ? [{ componentType: 'PLC', item: pVektor01 }] : []),
          ...pVektor01Actuators.map((actuator) => ({ componentType: 'ACTUATOR', item: actuator }))
        ]),
      },
      {
        key: 'alarma-roja-1',
        title: 'Alarma Roja 1',
        position: { top: '30.85%', left: '25.66%', width: '4.5%', height: '8%' },
        led: { top: '29.15%', left: '25.56%' },
        status: getActuatorSignalStatus(alarmaRoja1[0]),
        description: 'Salida de alarma/actuacion 1 comandada desde PVektor01.',
        metrics: [{ label: 'Actuadores asociados', value: alarmaRoja1.length }],
        rows: normalizeRows(alarmaRoja1, 'PVektor01'),
        snapshotEntries: buildSnapshotEntries(alarmaRoja1.map((actuator) => ({ componentType: 'ACTUATOR', item: actuator }))),
      },
      {
        key: 'alarma-roja-2',
        title: 'Alarma Roja 2',
        position: { top: '30.85%', left: '35.71%', width: '4.5%', height: '8%' },
        led: { top: '29.15%', left: '35.61%' },
        status: getActuatorSignalStatus(alarmaRoja2[0]),
        description: 'Salida de alarma/actuacion 2 comandada desde PVektor01.',
        metrics: [{ label: 'Actuadores asociados', value: alarmaRoja2.length }],
        rows: normalizeRows(alarmaRoja2, 'PVektor01'),
        snapshotEntries: buildSnapshotEntries(alarmaRoja2.map((actuator) => ({ componentType: 'ACTUATOR', item: actuator }))),
      },
      {
        key: 'alarma-roja-3',
        title: 'Alarma Roja 3',
        position: { top: '30.85%', left: '45.3%', width: '4.5%', height: '8%' },
        led: { top: '29.15%', left: '45.2%' },
        status: getActuatorSignalStatus(alarmaRoja3[0]),
        description: 'Salida de alarma/actuacion 3 comandada desde PVektor01.',
        metrics: [{ label: 'Actuadores asociados', value: alarmaRoja3.length }],
        rows: normalizeRows(alarmaRoja3, 'PVektor01'),
        snapshotEntries: buildSnapshotEntries(alarmaRoja3.map((actuator) => ({ componentType: 'ACTUATOR', item: actuator }))),
      },
      {
        key: 'switch-a',
        title: 'Switch A',
        position: { top: '28%', left: '80.5%', width: '11%', height: '9%' },
        led: { top: '26.2%', left: '89.5%' },
        status: getWorstStatus(
          [pVektor01, pVektor02]
            .filter(Boolean)
            .map((plc) => getSnapshotStatus('PLC', plc.id))
            .filter(Boolean),
          inferStatusFromItems([pVektor01, pVektor02].filter(Boolean))
        ),
        description: 'Switch industrial del Sector A. Solo conecta las placas PVektor01 y PVektor02.',
        metrics: [{ label: 'Equipos conectados', value: [pVektor01, pVektor02].filter(Boolean).length }],
        rows: normalizeRows([pVektor01, pVektor02].filter(Boolean), 'Switch A'),
        snapshotEntries: buildSnapshotEntries(
          [pVektor01, pVektor02].filter(Boolean).map((plc) => ({ componentType: 'PLC', item: plc }))
        ),
      },
      {
        key: 'pc-sistema',
        title: 'PC Sistema',
        position: { top: '47.5%', left: '4%', width: '18%', height: '18%' },
        led: { top: '45%', left: '6.5%' },
        status: healthSnapshotMap['SERVER:1']?.status || (plcs.length > 0 ? 'green' : 'yellow'),
        description: 'Interfaz HMI, servidor de comunicaciones y base de datos del sistema.',
        metrics: [
          { label: 'CPU', value: healthSnapshotMap['SERVER:1']?.metadata?.cpu_load ? `${healthSnapshotMap['SERVER:1'].metadata.cpu_load}%` : 'N/A' },
          {
            label: 'RAM',
            value: healthSnapshotMap['SERVER:1']?.metadata?.mem_used_gb
              ? `${healthSnapshotMap['SERVER:1'].metadata.mem_used_gb} / ${healthSnapshotMap['SERVER:1'].metadata.mem_total_gb} GB`
              : 'N/A'
          },
          {
            label: 'Disco',
            value: healthSnapshotMap['SERVER:1']?.metadata?.disk_used_gb
              ? `${healthSnapshotMap['SERVER:1'].metadata.disk_used_gb} / ${healthSnapshotMap['SERVER:1'].metadata.disk_total_gb} GB`
              : 'N/A'
          },
        ],
        rows: [
          {
            primary: 'Servidor de Aplicaciones',
            secondary: healthSnapshotMap['SERVER:1']?.metadata?.os_distro || 'Backend Node.js',
            state: healthSnapshotMap['SERVER:1']?.is_available ? 'Ejecutando' : 'No disponible'
          },
          {
            primary: 'Base de Datos',
            secondary: `PostgreSQL (${healthSnapshotMap['SERVER:1']?.metadata?.db_latency_ms || 0}ms)`,
            state: healthSnapshotMap['SERVER:1']?.metadata?.db_status === 'green' ? 'En Linea' : 'Error'
          },
        ],
        snapshotEntries: buildSnapshotEntries([{ componentType: 'SERVER', item: { id: 1 }, label: 'Métricas de Sistema' }]),
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
        snapshotEntries: buildSnapshotEntries(plcs.map((plc) => ({ componentType: 'PLC', item: plc }))),
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
        snapshotEntries: buildSnapshotEntries(plcs.map((plc) => ({ componentType: 'PLC', item: plc }))),
      },
      {
        key: 'switch-b',
        title: 'Switch B',
        position: { top: '57.5%', left: '72.1%', width: '11%', height: '8%' },
        led: { top: '55.7%', left: '81.1%' },
        status: inferStatusFromSnapshots('PLC', plc01S01 ? [plc01S01] : [], inferStatusFromItems(plc01S01 ? [plc01S01] : [])),
        description: 'Switch industrial del Sector B. El PLC01-S01 se conecta fisicamente a este switch.',
        metrics: [{ label: 'Equipos conectados', value: plc01S01 ? 1 : 0 }],
        rows: normalizeRows(plc01S01 ? [plc01S01] : [], 'Switch B'),
        snapshotEntries: buildSnapshotEntries(plc01S01 ? [{ componentType: 'PLC', item: plc01S01 }] : []),
      },
      {
        key: 'sensor-modbus-caudal',
        title: 'Sensor Caudal/Temperatura',
        position: { top: '64%', left: '53%', width: '7.5%', height: '8%' },
        led: { top: '62.3%', left: '51.9%' },
        status: inferStatusFromSnapshots(
          'SENSOR',
          sensorModbusCaudalSensors,
          inferStatusFromItems(sensorModbusCaudalSensors)
        ),
        description: 'Instrumento Modbus del Sector B que concentra mediciones de caudal y temperatura.',
        metrics: [{ label: 'Sensores asociados', value: sensorModbusCaudalSensors.length }],
        rows: normalizeRows(sensorModbusCaudalSensors, 'Sector B'),
        snapshotEntries: buildSnapshotEntries(
          sensorModbusCaudalSensors.map((sensor) => ({ componentType: 'SENSOR', item: sensor }))
        ),
      },
      {
        key: 'instrumentacion-sector-b',
        title: 'Instrumentacion de Campo Sector B',
        position: { top: '75.3%', left: '51.7%', width: '12%', height: '19%' },
        led: { top: '73.8%', left: '50%' },
        status: inferStatusFromSnapshots(
          'SENSOR',
          instrumentacionSectorBSensors,
          inferStatusFromItems(instrumentacionSectorBSensors)
        ),
        description: 'Instrumento local del Sector B asociado a los sensores CAUD02 y GAS001.',
        metrics: [{ label: 'Sensores asociados', value: instrumentacionSectorBSensors.length }],
        rows: normalizeRows(instrumentacionSectorBSensors, 'Sector B'),
        snapshotEntries: buildSnapshotEntries(
          instrumentacionSectorBSensors.map((sensor) => ({ componentType: 'SENSOR', item: sensor }))
        ),
      },
      {
        key: 'plc-sector-b',
        title: plc01S01?.nombre || 'PLC01-S01',
        position: { top: '73%', left: '74%', width: '16%', height: '12%' },
        led: { top: '71.2%', left: '90.2%' },
        status: inferStatusFromSnapshots('PLC', plc01S01 ? [plc01S01] : [], inferStatusFromItems(plc01S01 ? [plc01S01] : [])),
        description: 'PLC MODBUS de caudal y volumen de gas del Sector B.',
        metrics: [{ label: 'PLCs asociados', value: plc01S01 ? 1 : 0 }],
        rows: normalizeRows(plc01S01 ? [plc01S01] : [], 'Sector B'),
        snapshotEntries: buildSnapshotEntries(plc01S01 ? [{ componentType: 'PLC', item: plc01S01 }] : []),
      },
    ];
  }, [actuators, healthSnapshotMap, latestActuatorActions, plcs, sensors]);

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
        {healthSnapshotTime && (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
            Ultimo snapshot de housekeeping: {new Date(healthSnapshotTime).toLocaleString()}
          </Typography>
        )}

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

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Ultimo Snapshot
                </Typography>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {selectedComponent.snapshotEntries?.length > 0 ? (
                    selectedComponent.snapshotEntries.map((entry, index) => (
                      <Paper key={`${entry.label}-${index}`} variant="outlined" sx={{ p: 1.5, backgroundColor: '#f8fafc' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                          {entry.label}
                        </Typography>

                        {entry.snapshot.component_type === 'SERVER' ? (
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Métricas de Performance
                              </Typography>
                              <MetricBar label="Carga CPU" value={entry.snapshot.metadata?.cpu_load} />
                              <MetricBar
                                label="Uso de Memoria RAM"
                                value={entry.snapshot.metadata?.mem_used_percent}
                                subtitle={entry.snapshot.metadata?.mem_used_gb ? `${entry.snapshot.metadata.mem_used_gb}GB / ${entry.snapshot.metadata.mem_total_gb}GB` : null}
                              />
                              <MetricBar
                                label="Uso de Disco"
                                value={entry.snapshot.metadata?.disk_used_percent}
                                subtitle={entry.snapshot.metadata?.disk_used_gb ? `${entry.snapshot.metadata.disk_used_gb}GB / ${entry.snapshot.metadata.disk_total_gb}GB` : null}
                              />
                              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                                Uptime: {entry.snapshot.metadata?.uptime ? `${(entry.snapshot.metadata.uptime / 3600).toFixed(1)} hs` : 'N/A'}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                OS: {entry.snapshot.metadata?.os_platform} ({entry.snapshot.metadata?.os_distro})
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Estado de Infraestructura
                              </Typography>
                              <Stack spacing={1}>
                                <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#ffffff', borderLeft: `4px solid ${entry.snapshot.metadata?.db_status === 'green' ? '#16a34a' : '#dc2626'}` }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>TimescaleDB (PostgreSQL)</Typography>
                                  <Typography variant="caption" sx={{ color: entry.snapshot.metadata?.db_status === 'green' ? '#16a34a' : '#dc2626' }}>
                                    {entry.snapshot.metadata?.db_status === 'green' ? 'ONLINE - SERIES TEMPORALES' : 'OFFLINE'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Latencia Query: {entry.snapshot.metadata?.db_latency_ms}ms
                                  </Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#ffffff', borderLeft: '4px solid #16a34a' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Backend API & Sockets</Typography>
                                  <Typography variant="caption" sx={{ color: '#16a34a' }}>ONLINE - NODE.JS</Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Puerto: 3000 | Host: {window.location.hostname}
                                  </Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#ffffff', borderLeft: '4px solid #16a34a' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Frontend Dashboard</Typography>
                                  <Typography variant="caption" sx={{ color: '#16a34a' }}>REPRESENTACION VIVA</Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Framework: React (Vite)
                                  </Typography>
                                </Paper>
                              </Stack>
                            </Box>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              status: {formatSnapshotValue(entry.snapshot.status)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              is_available: {formatSnapshotValue(entry.snapshot.is_available)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              communication_state: {formatSnapshotValue(entry.snapshot.communication_state)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              latency_ms: {formatSnapshotValue(entry.snapshot.latency_ms)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              last_response_at: {formatSnapshotValue(entry.snapshot.last_response_at)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              timeout_count: {formatSnapshotValue(entry.snapshot.timeout_count)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 'bold' }}>
                              metadata:
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                mt: 0.5,
                                mb: 0,
                                p: 1,
                                borderRadius: 1,
                                backgroundColor: '#e2e8f0',
                                fontSize: '0.72rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              {formatSnapshotValue(entry.snapshot.metadata)}
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    ))
                  ) : (
                    <Typography color="textSecondary">Sin snapshot disponible para este componente.</Typography>
                  )}
                </Box>
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
