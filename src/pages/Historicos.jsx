import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, CircularProgress, Alert,
  TextField, Button, Select, MenuItem, InputLabel, FormControl,
  Stack, IconButton
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api'; // Assuming api service is set up
import {
  Download as DownloadIcon
} from '@mui/icons-material';
import { saveAs } from 'file-saver'; // For CSV export

const Historicos = () => {
  const [sensors, setSensors] = useState([]);
  const [sensorMeasurements, setSensorMeasurements] = useState([]);
  const [sensorEvents, setSensorEvents] = useState([]);
  const [actuatorActions, setActuatorActions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering state
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // Add state for other filters as needed (e.g., event type, user role)

  // Helper to format dates robustly for chart display
  const formatChartTime = (tickItem) => {
    try {
      const date = new Date(tickItem);
      // Ensure the date is valid before formatting
      if (isNaN(date.getTime())) {
        return tickItem; // Return original string if invalid date
      }
      // Display time in HH:MM:SS format
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      console.error("Error formatting date for chart:", tickItem, e);
      return tickItem; // Return original string if error occurs
    }
  };

  // Fetch initial data (sensors, measurements, events, actions, logs)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    console.log("Frontend: fetchData called.");
    try {
      // Fetch list of active sensors
      const sensorsResponse = await api.get('/sensors');
      const activeSensors = sensorsResponse.data.filter(s => s.activo);
      setSensors(activeSensors);
      console.log("Frontend: Fetched sensors:", activeSensors); // Log fetched sensors

      if (activeSensors.length > 0) {
        const firstActiveSensorId = activeSensors[0]?.id || '';
        setSelectedSensorId(firstActiveSensorId);
        // Fetch initial measurements only if a sensor is selected
        if (firstActiveSensorId) {
          await fetchSensorMeasurements(firstActiveSensorId);
        }
      } else {
        // If no active sensors, clear measurements and select none
        setSelectedSensorId('');
        setSensorMeasurements([]);
        console.log("Frontend: No active sensors found, clearing measurements.");
      }

      // Fetch other historical data types
      await fetchSensorEvents();
      await fetchActuatorActions();
      await fetchAuditLogs();

      console.log("Frontend: All initial data fetches complete.");

    } catch (err) {
      console.error("Frontend: Error during initial data fetch:", err);
      setError('Error al cargar los datos históricos iniciales.');
    } finally {
      setLoading(false);
      console.log("Frontend: Loading state set to false.");
    }
  }, []); // fetchData now depends on nothing external as it fetches its own dependencies

  const fetchSensorMeasurements = async (sensorId, startDate, endDate) => {
    if (!sensorId) {
      setSensorMeasurements([]); // Clear measurements if no sensor is selected
      console.log("Frontend: fetchSensorMeasurements called with no sensorId, clearing data.");
      return;
    }
    console.log(`Frontend: Fetching measurements for sensor ${sensorId} with date range ${startDate || 'default'} to ${endDate || 'default'}`);
    try {
      // Backend endpoint to fetch measurements for a sensor within a date range
      // Assumes the backend returns ISO 8601 strings for 'time'
      const response = await api.get(`/sensor-readings/${sensorId}`, {
        params: {
          startDate: startDate || dateRange.start,
          endDate: endDate || dateRange.end,
        }
      });
      // Reformat data for Recharts
      const formattedData = response.data.map(item => ({
        time: item.time, // Keep as ISO string for robust parsing by Recharts/Date
        value: parseFloat(item.value), // Ensure value is a number
        unit: item.unit || '' // Assuming unit is available
      }));
      setSensorMeasurements(formattedData);
      console.log("Frontend: Fetched sensor measurements:", formattedData); // Log fetched measurements
    } catch (err) {
      console.error("Frontend: Error fetching sensor measurements:", err);
      setError('Error al cargar las mediciones de sensores.');
    }
  };

  const fetchSensorEvents = async () => {
    console.log("Frontend: Fetching sensor events with date range:", dateRange);
    try {
      const response = await api.get('/sensor-events', { params: { ...dateRange } });
      const formattedEvents = response.data.map(item => ({ // Assuming timestamps are ISO 8601
        ...item,
        timestamp: new Date(item.timestamp).toLocaleString() // Format for display in table
      }));
      setSensorEvents(formattedEvents);
      console.log("Frontend: Fetched sensor events:", formattedEvents); // Log fetched events
    } catch (err) {
      console.error("Frontend: Error fetching sensor events:", err);
      setError('Error al cargar los eventos de sensores.');
    }
  };

  const fetchActuatorActions = async () => {
    console.log("Frontend: Fetching actuator actions with date range:", dateRange);
    try {
      const response = await api.get('/actuator-actions', { params: { ...dateRange } });
      const formattedActions = response.data.map(item => ({ // Assuming timestamps are ISO 8601
        ...item,
        timestamp: new Date(item.timestamp).toLocaleString() // Format for display in table
      }));
      setActuatorActions(formattedActions);
      console.log("Frontend: Fetched actuator actions:", formattedActions); // Log fetched actions
    } catch (err) {
      console.error("Frontend: Error fetching actuator actions:", err);
      setError('Error al cargar las acciones de actuadores.');
    }
  };

  const fetchAuditLogs = async () => {
    console.log("Frontend: Fetching audit logs with date range:", dateRange);
    try {
      const response = await api.get('/audit-logs', { params: { ...dateRange } });
      const formattedLogs = response.data.map(item => ({ // Assuming timestamps are ISO 8601
        ...item,
        timestamp: new Date(item.timestamp).toLocaleString() // Format for display in table
      }));
      setAuditLogs(formattedLogs);
      console.log("Frontend: Fetched audit logs:", formattedLogs); // Log fetched logs
    } catch (err) {
      console.error("Frontend: Error fetching audit logs:", err);
      setError('Error al cargar los logs de auditoría.');
    }
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    console.log("Frontend: useEffect triggered. selectedSensorId:", selectedSensorId, "dateRange:", dateRange);
    if (selectedSensorId) {
      fetchSensorMeasurements(selectedSensorId, dateRange.start, dateRange.end);
    } else {
      setSensorMeasurements([]); // Clear measurements if no sensor selected
      console.log("Frontend: No sensor selected, clearing measurements.");
    }
    fetchSensorEvents();
    fetchActuatorActions();
    fetchAuditLogs();
    console.log("Frontend: Fetching data for updated filters.");
  }, [selectedSensorId, dateRange.start, dateRange.end]); // Depend on filters

  const handleFilterChange = () => {
    // This function is now implicitly handled by the useEffect dependency array.
    console.log("Frontend: Filter change button pressed (or filter inputs changed). Triggering fetches.");
  };

  // CSV Export Functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar.');
      console.log("Frontend: Export to CSV called, but no data provided.");
      return;
    }
    console.log(`Frontend: Exporting ${data.length} rows to CSV: ${filename}.csv`);
    const csvRows = [];
    // Get headers dynamically from the first object, ensuring they are string keys
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
      // Map values to headers, ensuring they are strings and handling potential complex types
      const values = headers.map(header => {
        let cellValue = row[header];
        if (cellValue === null || cellValue === undefined) {
          cellValue = '';
        } else if (typeof cellValue === 'object') {
          cellValue = JSON.stringify(cellValue);
        } else {
          cellValue = String(cellValue);
        }
        // Escape quotes by doubling them
        const escaped = cellValue.replace(/"/g, '""');
        // Enclose all values in quotes to handle commas and newlines
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('
')], { type: 'text/csv;charset=utf-8;' }); // Corrected newline character
    saveAs(blob, `${filename}.csv`);
    console.log(`Frontend: File ${filename}.csv exported successfully.`);
  };

  // Data formatting for charts (already done in fetch functions for Recharts)
  // Ensure 'value' is numeric and 'time' is parseable by Date.

  // Render loading or error states
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

  // Helper to get the unit for Y-axis label
  const getYAxisUnit = () => {
    if (sensorMeasurements.length > 0 && sensorMeasurements[0].unit) {
      return sensorMeasurements[0].unit;
    }
    return 'Valor'; // Default label
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e293b' }}>
        Históricos y Auditoría
      </Typography>

      {/* Filters */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Filtros</Typography>
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
                  console.log("Frontend: Sensor selected in filter:", e.target.value);
                  // Fetch measurements for the newly selected sensor immediately.
                  // The useEffect dependency array will handle re-fetching other data if date range changes.
                }}
              >
                <MenuItem value="">Todos los Sensores</MenuItem>
                {sensors.map((sensor) => (
                  <MenuItem key={sensor.id} value={sensor.id}>{sensor.tag_name}</MenuItem>
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
                console.log("Frontend: Date range start changed:", e.target.value);
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
                console.log("Frontend: Date range end changed:", e.target.value);
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            {/* Filter button is now implicitly handled by useEffect on filter changes */}
            {/* <Button variant="contained" onClick={handleFilterChange} sx={{ height: '100%', width: '100%' }}>Filtrar</Button> */}
          </Grid>
           <Grid item xs={12} sm={6} md={1}>
            {/* Placeholder for Global CSV Export if needed */}
          </Grid>
        </Grid>
      </Paper>

      {/* Sensor Measurements Chart */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Mediciones de Sensores
            {selectedSensorId && sensors.find(s => s.id === selectedSensorId) && (
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                ({sensors.find(s => s.id === selectedSensorId)?.tag_name} - {sensors.find(s => s.id === selectedSensorId)?.unidad_medida || ''})
              </Typography>
            )}
          </Typography>
          <IconButton onClick={() => exportToCSV(sensorMeasurements, 'mediciones_sensores')} disabled={sensorMeasurements.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 400 }}>
          {sensorMeasurements.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sensorMeasurements} // Use raw data fetched, formatting done in formatters
                margin={{ top: 5, right: 30, left: 20, bottom: 50 }} // Increased bottom margin for rotated labels
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tickFormatter={formatChartTime} // Use the helper function for robust formatting
                  angle={-45}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  height={70} // Increased height to accommodate rotated labels
                />
                <YAxis
                  stroke="#64748b"
                  label={{
                    value: getYAxisUnit(),
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b'
                  }}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const dataItem = props.payload; // Access the full data item for the point
                    const unit = dataItem ? dataItem.unit : '';
                    return `${value.toFixed(2)} ${unit}`;
                  }}
                  labelFormatter={(label) => formatChartTime(label)} // Format tooltip label as well
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
              <Typography color="textSecondary">Selecciona un sensor y un rango de fechas para ver las mediciones.</Typography>
            </Box>
          )}
          {sensorMeasurements.length > 0 && console.log("Frontend: Data for chart:", sensorMeasurements)}
          {sensorMeasurements.length === 0 && console.log("Frontend: No data to render chart for sensor measurements.")}
        </Box>
      </Paper>

      {/* Sensor Events Table */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Eventos de Sensores</Typography>
          <IconButton onClick={() => exportToCSV(sensorEvents, 'eventos_sensores')} disabled={sensorEvents.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {sensorEvents.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {/* Assuming sensorEvents have keys like 'timestamp', 'sensor_name', 'event_type', 'message' */}
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Sensor</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Tipo Evento</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {sensorEvents.map((event, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.timestamp}</td> {/* Already formatted in fetch */}
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.sensor_name || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.event_type || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{event.message || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">No hay eventos de sensores registrados para el período seleccionado.</Typography>
          )}
          {sensorEvents.length === 0 && console.log("Frontend: No sensor events data to display.")}
        </Box>
      </Paper>

      {/* Actuator Actions Table */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Acciones de Actuadores</Typography>
          <IconButton onClick={() => exportToCSV(actuatorActions, 'acciones_actuadores')} disabled={actuatorActions.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {actuatorActions.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {/* Assuming actuatorActions have keys like 'timestamp', 'actuator_name', 'action_type', 'user_id' */}
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Actuador</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Acción</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {actuatorActions.map((action, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.timestamp}</td> {/* Already formatted in fetch */}
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.actuator_name || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.action_type || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{action.user_name || action.user_id || 'N/A'}</td> {/* Display user name if available, else ID */}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">No hay acciones de actuadores registradas para el período seleccionado.</Typography>
          )}
          {actuatorActions.length === 0 && console.log("Frontend: No actuator actions data to display.")}
        </Box>
      </Paper>

      {/* Audit Logs Table */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Logs de Auditoría</Typography>
          <IconButton onClick={() => exportToCSV(auditLogs, 'audit_logs')} disabled={auditLogs.length === 0}>
            <DownloadIcon /> Descargar CSV
          </IconButton>
        </Box>
        <Box sx={{ height: 300, overflowY: 'auto' }}>
          {auditLogs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {/* Assuming auditLogs have keys like 'timestamp', 'user_id', 'action', 'component', 'details' */}
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Timestamp</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Usuario</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Acción</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Componente</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.timestamp}</td> {/* Already formatted in fetch */}
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.user_name || log.user_id || 'N/A'}</td> {/* Display user name if available, else ID */}
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.action || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.component || 'N/A'}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{log.details || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="textSecondary">No hay logs de auditoría registrados para el período seleccionado.</Typography>
          )}
          {auditLogs.length === 0 && console.log("Frontend: No audit logs data to display.")}
        </Box>
      </Paper>

    </Box>
  );
};

export default Historicos;
