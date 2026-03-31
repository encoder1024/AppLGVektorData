import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  ToggleOn as ToggleOnIcon,
  RadioButtonChecked as PulseIcon,
  SettingsInputComponent as ActuatorIcon
} from '@mui/icons-material';
import GaugeComponent from 'react-gauge-component';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SWITCH_UI_TYPES = new Set(['SWITCH_ON_OFF', 'SELECTOR_MODO']);
const PULSE_UI_TYPES = new Set(['PULSADOR_MOMENTANEO']);
const ACTUATOR_ACTIVE_WINDOW_MS = 1500;
const DASHBOARD_CARD_WIDTH = 280;
const DASHBOARD_ZONES = [
  {
    key: 'ZONA_A',
    label: 'Zona A',
    containerBg: '#eef6ff',
    borderColor: '#93c5fd',
    columns: { xs: 1, sm: 2, md: 3 }
  },
  {
    key: 'ZONA_B',
    label: 'Zona B',
    containerBg: '#f3fdf4',
    borderColor: '#86efac',
    columns: { xs: 1, sm: 2, md: 2 }
  }
];

const getDashboardCardId = (type, id) => `${type}-${id}`;

const getActuatorVisualVariant = (actuator) => {
  if (PULSE_UI_TYPES.has(actuator.tipo_ui)) {
    return 'pulse';
  }
  if (SWITCH_UI_TYPES.has(actuator.tipo_ui)) {
    return 'switch';
  }
  return 'generic';
};

const getActuatorUiLabel = (tipoUi) => {
  if (tipoUi === 'SWITCH_ON_OFF') {
    return 'SWITCH ON/OFF';
  }
  if (tipoUi === 'PULSADOR_MOMENTANEO') {
    return 'PULSADOR';
  }
  if (tipoUi === 'SELECTOR_MODO') {
    return 'SELECTOR';
  }
  if (tipoUi === 'DESLIZADOR_ANALOGICO') {
    return 'DESLIZADOR';
  }
  return tipoUi || 'ACTUADOR';
};

const parseActuatorState = (action) => {
  if (!action) {
    return { active: false, label: 'SIN ACCION', valueText: 'OFF' };
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

  const active =
    candidateValue === true ||
    numericValue === 1 ||
    ['ON', 'TRUE', 'OPEN', 'START', 'ENABLE', 'ENABLED', 'HIGH'].includes(normalizedText) ||
    normalizedText.includes('PULSE');

  const label = action.action_type
    ? action.action_type.replace(/_/g, ' ')
    : active
      ? 'ACTIVO'
      : 'INACTIVO';

  return {
    active,
    label,
    valueText:
      candidateValue === undefined || candidateValue === null || candidateValue === ''
        ? active
          ? 'ON'
          : 'OFF'
        : String(candidateValue)
  };
};

const getActuatorStatus = (actuator, action) => {
  const variant = getActuatorVisualVariant(actuator);
  const parsedState = parseActuatorState(action);
  const actionTime = action?.timestamp ? new Date(action.timestamp).getTime() : null;
  const pulseActive =
    variant === 'pulse' &&
    parsedState.active &&
    actionTime &&
    Date.now() - actionTime <= ACTUATOR_ACTIVE_WINDOW_MS;
  const active = variant === 'pulse' ? Boolean(pulseActive) : parsedState.active;

  return {
    active,
    color: active ? '#2563eb' : '#64748b',
    label: active ? 'SALIDA ACTIVA' : 'SALIDA EN REPOSO',
    actionLabel: parsedState.label,
    valueText: variant === 'pulse' ? (active ? 'PULSE' : 'READY') : parsedState.valueText,
    timestamp: action?.timestamp || null
  };
};

const ActuatorIllustration = ({ actuator, status }) => {
  const variant = getActuatorVisualVariant(actuator);

  if (variant === 'pulse') {
    return (
      <svg viewBox="0 0 220 120" width="100%" height="100%" role="img" aria-label={`Pulsador ${status.active ? 'activo' : 'en reposo'}`}>
        <ellipse cx="110" cy="95" rx="72" ry="14" fill="rgba(15, 23, 42, 0.08)" />
        <rect x="55" y="42" width="110" height="34" rx="12" fill="#cbd5e1" />
        <rect x="64" y="34" width="92" height="20" rx="10" fill="#94a3b8" />
        <g style={{ transformOrigin: '110px 36px', transform: status.active ? 'translateY(12px)' : 'translateY(0px)', transition: 'transform 180ms ease' }}>
          <ellipse cx="110" cy="36" rx="48" ry="24" fill={status.active ? '#2563eb' : '#e2e8f0'} />
          <ellipse cx="110" cy="31" rx="36" ry="15" fill={status.active ? '#60a5fa' : '#f8fafc'} />
        </g>
      </svg>
    );
  }

  if (variant === 'switch') {
    return (
      <svg viewBox="0 0 220 120" width="100%" height="100%" role="img" aria-label={`Switch ${status.active ? 'encendido' : 'apagado'}`}>
        <rect
          x="30"
          y="28"
          width="160"
          height="64"
          rx="32"
          fill={status.active ? '#bfdbfe' : '#cbd5e1'}
          style={{ transition: 'fill 220ms ease' }}
        />
        <circle
          cx={status.active ? 156 : 64}
          cy="60"
          r="28"
          fill="#ffffff"
          stroke={status.active ? '#2563eb' : '#94a3b8'}
          strokeWidth="4"
          style={{ transition: 'cx 220ms ease, stroke 220ms ease' }}
        />
        <text x="48" y="106" fontSize="16" fill="#475569" fontWeight="700">
          OFF
        </text>
        <text x="152" y="106" fontSize="16" fill="#2563eb" fontWeight="700" textAnchor="end">
          ON
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 120" width="100%" height="100%" role="img" aria-label={`Actuador ${status.active ? 'activo' : 'inactivo'}`}>
      <rect x="42" y="22" width="136" height="76" rx="18" fill="#e2e8f0" />
      <rect x="58" y="38" width="104" height="44" rx="12" fill={status.active ? '#dbeafe' : '#f8fafc'} />
      <circle cx="84" cy="60" r="10" fill={status.active ? '#2563eb' : '#94a3b8'} />
      <rect x="104" y="50" width="40" height="20" rx="10" fill={status.active ? '#60a5fa' : '#cbd5e1'} />
    </svg>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [actuators, setActuators] = useState([]);
  const [readings, setReadings] = useState({});
  const [latestActuatorActions, setLatestActuatorActions] = useState({});
  const [actuatorCommandLoading, setActuatorCommandLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [cardOrder, setCardOrder] = useState([]);
  const [draggedCardId, setDraggedCardId] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const canControlActuators = ['ADMIN', 'DEVELOPER', 'LIDER', 'TECHNICIAN'].includes(user?.role);
  const dashboardOrderStorageKey = useMemo(
    () => `dashboard-card-order:${user?.id || user?.email || 'anonymous'}`,
    [user]
  );

  const fetchDashboardData = async () => {
    setError('');
    try {
      const [sensorResponse, actuatorResponse, actuatorActionsResponse] = await Promise.all([
        api.get('/sensors'),
        api.get('/actuators'),
        api.get('/actuator-actions')
      ]);

      const activeSensors = sensorResponse.data.filter((sensor) => sensor.activo);
      const activeActuators = actuatorResponse.data.filter((actuator) => actuator.activo !== false);
      const initialReadings = {};

      activeSensors.forEach((sensor) => {
        initialReadings[sensor.id] = 0;
      });

      const lastActionByActuator = {};
      (actuatorActionsResponse.data || []).forEach((action) => {
        if (!action.actuator_id || lastActionByActuator[action.actuator_id]) {
          return;
        }
        lastActionByActuator[action.actuator_id] = action;
      });

      setSensors(activeSensors);
      setActuators(activeActuators);
      setReadings(initialReadings);
      setLatestActuatorActions(lastActionByActuator);
    } catch (err) {
      setError('Error al cargar la configuracion del dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const setActuatorCommandState = (actuatorId, nextAction) => {
    setLatestActuatorActions((prev) => ({
      ...prev,
      [actuatorId]: nextAction
    }));
  };

  const sendActuatorCommand = async (actuator, payload) => {
    if (!canControlActuators) {
      return;
    }

    setActuatorCommandLoading((prev) => ({ ...prev, [actuator.id]: true }));
    setError('');

    try {
      const response = await api.post(`/actuators/${actuator.id}/control`, payload);
      if (response.data?.action) {
        setActuatorCommandState(actuator.id, response.data.action);
      }
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage
          ? `${actuator.nombre}: ${backendMessage}`
          : `Error al controlar el actuador ${actuator.nombre}.`
      );
    } finally {
      setActuatorCommandLoading((prev) => ({ ...prev, [actuator.id]: false }));
    }
  };

  const handleToggleActuator = (actuator, nextState) => {
    sendActuatorCommand(actuator, { state: nextState });
  };

  const handlePulseActuator = (actuator) => {
    sendActuatorCommand(actuator, { state: true, pulse_ms: 400 });
  };

  useEffect(() => {
    fetchDashboardData();
    const socket = io('http://localhost:3000');

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('sensor_update', (data) => {
      setReadings((prev) => ({ ...prev, [data.sensor_id]: data.value }));
    });
    socket.on('actuator_update', (data) => {
      setActuatorCommandState(data.actuator_id, {
        actuator_id: data.actuator_id,
        action_type: 'SET_STATE',
        timestamp: data.time,
        details: {
          state: data.state,
          value: data.value
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setCardOrder([]);
      return;
    }

    try {
      const storedOrder = JSON.parse(localStorage.getItem(dashboardOrderStorageKey) || '[]');
      if (Array.isArray(storedOrder)) {
        setCardOrder(storedOrder);
      }
    } catch (err) {
      console.error('Error al leer el orden del dashboard:', err);
    }
  }, [dashboardOrderStorageKey, isAdmin]);

  const dashboardCards = useMemo(() => {
    const sensorCards = sensors.map((sensor) => ({
      id: getDashboardCardId('sensor', sensor.id),
      entityType: 'sensor',
      data: sensor
    }));
    const actuatorCards = actuators.map((actuator) => ({
      id: getDashboardCardId('actuator', actuator.id),
      entityType: 'actuator',
      data: actuator
    }));

    return [...sensorCards, ...actuatorCards];
  }, [actuators, sensors]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const currentCardIds = dashboardCards.map((card) => card.id);
    setCardOrder((prevOrder) => {
      const preserved = prevOrder.filter((id) => currentCardIds.includes(id));
      const missing = currentCardIds.filter((id) => !preserved.includes(id));
      const nextOrder = [...preserved, ...missing];
      localStorage.setItem(dashboardOrderStorageKey, JSON.stringify(nextOrder));
      return nextOrder;
    });
  }, [dashboardCards, dashboardOrderStorageKey, isAdmin]);

  const orderedCards = useMemo(
    () =>
      [...dashboardCards].sort((a, b) => {
        const zoneA = a.data.zona || 'ZONA_A';
        const zoneB = b.data.zona || 'ZONA_A';
        if (zoneA !== zoneB) {
          return zoneA.localeCompare(zoneB);
        }

        const orderA = Number(a.data.orden_dashboard ?? 0);
        const orderB = Number(b.data.orden_dashboard ?? 0);
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return String(a.data.nombre || a.data.tag_name || '').localeCompare(String(b.data.nombre || b.data.tag_name || ''));
      }),
    [dashboardCards]
  );

  const moveCard = (fromId, toId) => {
    if (!isAdmin || fromId === toId) {
      return;
    }

    setCardOrder((prevOrder) => {
      const baseOrder = prevOrder.length > 0 ? [...prevOrder] : dashboardCards.map((card) => card.id);
      const fromIndex = baseOrder.indexOf(fromId);
      const toIndex = baseOrder.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) {
        return prevOrder;
      }

      const [moved] = baseOrder.splice(fromIndex, 1);
      baseOrder.splice(toIndex, 0, moved);
      localStorage.setItem(dashboardOrderStorageKey, JSON.stringify(baseOrder));
      return baseOrder;
    });
  };

  const handleDragStart = (cardId) => {
    if (!isAdmin) {
      return;
    }
    setDraggedCardId(cardId);
  };

  const handleDragOver = (event) => {
    if (!isAdmin) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetCardId) => {
    if (!isAdmin || !draggedCardId) {
      return;
    }
    moveCard(draggedCardId, targetCardId);
    setDraggedCardId(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
  };

  const getSensorStatus = (sensor, value) => {
    if (sensor.alert_high && value >= sensor.alert_high) {
      return { label: 'ALERTA ALTO NIVEL', color: '#ef4444', icon: <ErrorIcon /> };
    }
    if (sensor.alert_low && value <= sensor.alert_low) {
      return { label: 'ALERTA BAJO NIVEL', color: '#ef4444', icon: <ErrorIcon /> };
    }
    if (sensor.warning_high && value >= sensor.warning_high) {
      return { label: 'AVISO ALTO NIVEL', color: '#f59e0b', icon: <WarningIcon /> };
    }
    if (sensor.warning_low && value <= sensor.warning_low) {
      return { label: 'AVISO BAJO NIVEL', color: '#f59e0b', icon: <WarningIcon /> };
    }

    return { label: 'SISTEMA NORMAL', color: '#10b981', icon: <CheckIcon /> };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

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
              label={connected ? 'POLLING ACTIVO' : 'RECONECTANDO...'}
              color={connected ? 'success' : 'error'}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>

        <IconButton onClick={fetchDashboardData}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 3fr) minmax(0, 2fr)'
          },
          alignItems: 'start'
        }}
      >
        {DASHBOARD_ZONES.map((zone) => (
          <Paper
            key={zone.key}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: zone.containerBg,
              border: `1px solid ${zone.borderColor}`
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 2 }}>
              {zone.label}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: `repeat(${zone.columns.xs}, minmax(0, 1fr))`,
                  sm: `repeat(${zone.columns.sm}, minmax(0, 1fr))`,
                  md: `repeat(${zone.columns.md}, minmax(0, 1fr))`
                },
                alignItems: 'stretch'
              }}
            >
        {orderedCards.filter((card) => (card.data.zona || 'ZONA_A') === zone.key).map((card) => {
          if (card.entityType === 'sensor') {
            const sensor = card.data;
            const value = readings[sensor.id] ?? 0;
            const status = getSensorStatus(sensor, value);

            return (
              <Box
                key={card.id}
                sx={{ display: 'flex', justifyContent: 'center' }}
                draggable={isAdmin}
                onDragStart={() => handleDragStart(card.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(card.id)}
                onDragEnd={handleDragEnd}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 0,
                    width: '100%',
                    maxWidth: `${DASHBOARD_CARD_WIDTH}px`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 2,
                    borderTop: `8px solid ${status.color}`,
                    transition: 'all 0.3s ease',
                    cursor: isAdmin ? 'grab' : 'default',
                    opacity: draggedCardId === card.id ? 0.7 : 1
                  }}
                >
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                        {sensor.tag_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {sensor.plc_nombre}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      spacing={0.5}
                      sx={{ color: status.color, width: 150, minWidth: 150, justifyContent: 'flex-end', textAlign: 'right', flexShrink: 0 }}
                    >
                      {status.icon}
                      <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {status.label}
                      </Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ height: 110, px: 1.5 }}>
                    <GaugeComponent
                      value={value}
                      type="grafana"
                      minValue={sensor.min_range || 0}
                      maxValue={sensor.max_range || 100}
                      arc={{
                        width: 0.2,
                        padding: 0.02,
                        cornerRadius: 1,
                        subArcs: [
                          { limit: sensor.alert_low || sensor.min_range, color: '#ef4444' },
                          { limit: sensor.warning_low || sensor.min_range, color: '#f59e0b' },
                          { limit: sensor.warning_high || sensor.max_range, color: '#10b981' },
                          { limit: sensor.alert_high || sensor.max_range, color: '#ef4444' }
                        ]
                          .filter((arc) => arc.limit !== undefined && arc.limit !== null)
                          .sort((a, b) => a.limit - b.limit)
                      }}
                      labels={{
                        valueLabel: {
                          style: { fontSize: '41px', fill: status.color, fontWeight: 'bold' },
                          formatTextValue: (currentValue) => `${currentValue.toFixed(1)} ${sensor.unidad_medida || ''}`
                        },
                        tickLabels: {
                          type: 'outer',
                          defaultTickValueConfig: {
                            style: { fontSize: '18px', fill: '#475569', fontWeight: 'bold' }
                          }
                        }
                      }}
                    />
                  </Box>

                  <Box sx={{ bgcolor: '#f8fafc', px: 2, py: 0.75, borderTop: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
                      Reg: {sensor.direccion_memoria} | {sensor.tipo_dato_plc}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            );
          }

          const actuator = card.data;
          const status = getActuatorStatus(actuator, latestActuatorActions[actuator.id]);
          const variant = getActuatorVisualVariant(actuator);
          const isActuatorBusy = Boolean(actuatorCommandLoading[actuator.id]);
          const statusIcon =
            variant === 'pulse'
              ? <PulseIcon sx={{ color: status.color }} />
              : variant === 'switch'
                ? <ToggleOnIcon sx={{ color: status.color }} />
                : <ActuatorIcon sx={{ color: status.color }} />;

          return (
            <Box
              key={card.id}
              sx={{ display: 'flex', justifyContent: 'center' }}
              draggable={isAdmin}
              onDragStart={() => handleDragStart(card.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(card.id)}
              onDragEnd={handleDragEnd}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 0,
                  width: '100%',
                  maxWidth: `${DASHBOARD_CARD_WIDTH}px`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 2,
                  borderTop: `8px solid ${status.color}`,
                  transition: 'all 0.3s ease',
                  cursor: isAdmin ? 'grab' : 'default',
                  opacity: draggedCardId === card.id ? 0.7 : 1
                }}
              >
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 0, pr: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                      {actuator.nombre}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {actuator.plc_nombre}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    spacing={0.5}
                    sx={{ color: status.color, width: 150, minWidth: 150, justifyContent: 'flex-end', textAlign: 'right', flexShrink: 0 }}
                  >
                    {statusIcon}
                    <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {status.label}
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ height: 110, px: 1.5, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    role={canControlActuators ? 'button' : undefined}
                    tabIndex={canControlActuators ? 0 : -1}
                    aria-label={`${actuator.nombre} ${variant === 'pulse' ? 'disparar' : status.active ? 'desactivar' : 'activar'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!canControlActuators || isActuatorBusy) {
                        return;
                      }
                      if (variant === 'pulse') {
                        handlePulseActuator(actuator);
                        return;
                      }
                      if (variant === 'switch') {
                        handleToggleActuator(actuator, !status.active);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!canControlActuators || isActuatorBusy) {
                        return;
                      }
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return;
                      }
                      event.preventDefault();
                      if (variant === 'pulse') {
                        handlePulseActuator(actuator);
                        return;
                      }
                      if (variant === 'switch') {
                        handleToggleActuator(actuator, !status.active);
                      }
                    }}
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canControlActuators ? 'pointer' : 'default',
                      borderRadius: 2,
                      outline: 'none',
                      opacity: isActuatorBusy ? 0.7 : 1
                    }}
                  >
                    <ActuatorIllustration actuator={actuator} status={status} />
                  </Box>
                </Box>

                <Box sx={{ bgcolor: '#f8fafc', px: 2, py: 1, borderTop: '1px solid #e2e8f0', mt: 'auto', minHeight: 74, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', textAlign: 'center', lineHeight: 1.3 }}
                  >
                    {actuator.descripcion || 'Sin descripcion configurada'}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          );
        })}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default Dashboard;
