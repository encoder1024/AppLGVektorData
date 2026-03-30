import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import api from '../services/api';

const Historicos = () => {
  const [sensors, setSensors] = useState([]);
  const [sensorMeasurements, setSensorMeasurements] = useState([]);
  const [sensorEvents, setSensorEvents] = useState([]);
  const [actuatorActions, setActuatorActions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const formatChartTime = (tickItem) => {
    try {
      const date = new Date(tickItem);
      if (Number.isNaN(date.getTime())) {
        return tickItem;
      }
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date for chart:', tickItem, e);
      return tickItem;
    }
  };

  const fetchSensorMeasurements = async (sensorId, startDate, endDate) => {
    if (!sensorId) {
      setSensorMeasurements([]);
      console.log('Frontend: fetchSensorMeasurements called with no sensorId, clearing data.');
      return;
    }

    console.log(
      `Frontend: Fetching measurements for sensor ${sensorId} with date range ${startDate || 'default'} to ${endDate || 'default'}`
    );

    try {
      const response = await api.get(`/sensors/${sensorId}/readings`, {
        params: {
          start: startDate || dateRange.start || undefined,
          end: endDate || dateRange.end || undefined,
        },
      });

      const formattedData = response.data.map((item) => ({
        time: item.time,
        value: Number.parseFloat(item.value),
        unit: item.unit || '',
      }));

      setSensorMeasurements(formattedData);
      console.log('Frontend: Fetched sensor measurements:', formattedData);
    } catch (err) {
      console.error('Frontend: Error fetching sensor measurements:', err);
      setError('Error al cargar las mediciones de sensores.');
    }
  };

  const fetchSensorEvents = async (sensorId = selectedSensorId) => {
    console.log('Frontend: Fetching sensor events with date range:', dateRange);

    try {
      const response = await api.get('/sensor-events', {
        params: {
          start: dateRange.start || undefined,
          end: dateRange.end || undefined,
          sensor_id: sensorId || undefined,
        },
      });

      const formattedEvents = response.data.map((item) => ({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A',
      }));

      setSensorEvents(formattedEvents);
      console.log('Frontend: Fetched sensor events:', formattedEvents);
    } catch (err) {
      console.error('Frontend: Error fetching sensor events:', err);
      setError('Error al cargar los eventos de sensores.');
    }
  };

  const fetchActuatorActions = async () => {
    console.log('Frontend: Fetching actuator actions with date range:', dateRange);

    try {
      const response = await api.get('/actuator-actions', {
        params: {
          start: dateRange.start || undefined,
          end: dateRange.end || undefined,
        },
      });

      const formattedActions = response.data.map((item) => ({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A',
      }));

      setActuatorActions(formattedActions);
      console.log('Frontend: Fetched actuator actions:', formattedActions);
    } catch (err) {
      console.error('Frontend: Error fetching actuator actions:', err);
      setError('Error al cargar las acciones de actuadores.');
    }
  };

  const fetchAuditLogs = async () => {
    console.log('Frontend: Fetching audit logs with date range:', dateRange);

    try {
      const response = await api.get('/audit-logs', {
        params: {
          start: dateRange.start || undefined,
          end: dateRange.end || undefined,
        },
      });

      const formattedLogs = response.data.map((item) => ({
        ...item,
        timestamp: item.time ? new Date(item.time).toLocaleString() : 'N/A',
        action: item.accion_tipo || 'N/A',
        component: item.target_id ? `ID ${item.target_id}` : 'Sistema',
        details: item.descripcion || 'N/A',
      }));

      setAuditLogs(formattedLogs);
      console.log('Frontend: Fetched audit logs:', formattedLogs);
    } catch (err) {
      console.error('Frontend: Error fetching audit logs:', err);
      setError('Error al cargar los logs de auditoria.');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    console.log('Frontend: fetchData called.');

    try {
      const sensorsResponse = await api.get('/sensors');
      const activeSensors = sensorsResponse.data.filter((sensor) => sensor.activo);
      const firstActiveSensorId = activeSensors[0]?.id || '';

      setSensors(activeSensors);
      setSelectedSensorId(firstActiveSensorId);
      console.log('Frontend: Fetched sensors:', activeSensors);

      if (firstActiveSensorId) {
        await fetchSensorMeasurements(firstActiveSensorId, dateRange.start, dateRange.end);
      } else {
        setSensorMeasurements([]);
        console.log('Frontend: No active sensors found, clearing measurements.');
      }

      await fetchSensorEvents(firstActiveSensorId);
      await fetchActuatorActions();
      await fetchAuditLogs();

      console.log('Frontend: All initial data fetches complete.');
    } catch (err) {
      console.error('Frontend: Error during initial data fetch:', err);
      setError('Error al cargar los datos historicos iniciales.');
    } finally {
      setInitialized(true);
      setLoading(false);
      console.log('Frontend: Loading state set to false.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    console.log('Frontend: useEffect triggered. selectedSensorId:', selectedSensorId, 'dateRange:', dateRange);

    if (selectedSensorId) {
      fetchSensorMeasurements(selectedSensorId, dateRange.start, dateRange.end);
    } else {
      setSensorMeasurements([]);
      console.log('Frontend: No sensor selected, clearing measurements.');
    }

    fetchSensorEvents(selectedSensorId);
    fetchActuatorActions();
    fetchAuditLogs();
    console.log('Frontend: Fetching data for updated filters.');
  }, [initialized, selectedSensorId, dateRange.start, dateRange.end]);

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar.');
      console.log('Frontend: Export to CSV called, but no data provided.');
      return;
    }

    console.log(`Frontend: Exporting ${data.length} rows to CSV: ${filename}.csv`);
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        let cellValue = row[header];
        if (cellValue === null || cellValue === undefined) {
          cellValue = '';
        } else if (typeof cellValue === 'object') {
          cellValue = JSON.stringify(cellValue);
        } else {
          cellValue = String(cellValue);
        }

        const escaped = cellValue.replace(/"/g, '""');
        return `"${escaped}"`;
      });

      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
    console.log(`Frontend: File ${filename}.csv exported successfully.`);
  };

  const getYAxisUnit = () => {
    if (sensorMeasurements.length > 0 && sensorMeasurements[0].unit) {
      return sensorMeasurements[0].unit;
    }
    return 'Valor';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando datos...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e293b' }}>
        Historicos y Auditoria
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Filtros
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="sensor-select-label">Sensor</InputLabel>
              <Select
                labelId="sensor-select-label"
                id="sensor-select"
                value={selectedSensorId || ''}
                label="Sensor"
                onChange={(e) => {
                  setSelectedSensorId(e.target.value);
                  console.log('Frontend: Sensor selected in filter:', e.target.value);
                }}
              >
                <MenuItem value="">Todos los Sensores</MenuItem>
                {sensors.map((sensor) => (
                  <MenuItem key={sensor.id} value={sensor.id}>
                    {sensor.tag_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Fecha Inicio"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                console.log('Frontend: Date range start changed:', e.target.value);
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Fecha Fin"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                console.log('Frontend: Date range end changed:', e.target.value);
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1} />
          <Grid item xs={12} sm={6} md={1} />
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Mediciones de Sensores
            {selectedSensorId && sensors.find((sensor) => sensor.id === selectedSensorId) && (
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                ({sensors.find((sensor) => sensor.id === selectedSensorId)?.tag_name} -{' '}
                {sensors.find((sensor) => sensor.id === selectedSensorId)?.unidad_medida || ''})
              </Typography>
            )}
          </Typography>
          <IconButton
            onClick={() => exportToCSV(sensorMeasurements, 'mediciones_sensores')}
            disabled={sensorMeasurements.length === 0}
          >
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 400 }}>
          {sensorMeasurements.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorMeasurements} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tickFormatter={formatChartTime}
                  angle={-45}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  height={70}
                />
                <YAxis
                  stroke="#64748b"
                  label={{
                    value: getYAxisUnit(),
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                  }}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const dataItem = props.payload;
                    const unit = dataItem ? dataItem.unit : '';
                    return `${Number(value).toFixed(2)} ${unit}`;
                  }}
                  labelFormatter={(label) => formatChartTime(label)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  activeDot={{ r: 5 }}
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography color="textSecondary">
                Selecciona un sensor y un rango de fechas para ver las mediciones.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Eventos de Sensores
          </Typography>
          <IconButton onClick={() => exportToCSV(sensorEvents, 'eventos_sensores')} disabled={sensorEvents.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {sensorEvents.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Sensor</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Tipo Evento</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {sensorEvents.map((event, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.timestamp}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.sensor_name || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.event_type || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.message || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">No hay eventos de sensores registrados para el periodo seleccionado.</Typography>
          )}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Acciones de Actuadores
          </Typography>
          <IconButton
            onClick={() => exportToCSV(actuatorActions, 'acciones_actuadores')}
            disabled={actuatorActions.length === 0}
          >
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {actuatorActions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Actuador</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Accion</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {actuatorActions.map((action, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.timestamp}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.actuator_name || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.action_type || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.user_name || action.user_id || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">
              No hay acciones de actuadores registradas para el periodo seleccionado.
            </Typography>
          )}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Logs de Auditoria
          </Typography>
          <IconButton onClick={() => exportToCSV(auditLogs, 'audit_logs')} disabled={auditLogs.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {auditLogs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Usuario</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Accion</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Componente</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.timestamp}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.user_name || log.user_id || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.action || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.component || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.details || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">No hay logs de auditoria registrados para el periodo seleccionado.</Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Historicos;
