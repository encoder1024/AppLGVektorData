import React, { useEffect, useMemo, useState } from 'react';
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
  Checkbox,
  ListItemText,
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
  Brush,
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import api from '../services/api';

const Historicos = () => {
  const [sensors, setSensors] = useState([]);
  const [sensorMeasurements, setSensorMeasurements] = useState([]);
  const [sensorEvents, setSensorEvents] = useState([]);
  const [eventSensorSeries, setEventSensorSeries] = useState([]);
  const [eventSeriesLoading, setEventSeriesLoading] = useState(false);
  const [selectedEventSensorIds, setSelectedEventSensorIds] = useState([]);
  const [eventSelectionWarning, setEventSelectionWarning] = useState('');
  const [actuatorActions, setActuatorActions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [measurementBrushRange, setMeasurementBrushRange] = useState({ startIndex: 0, endIndex: 0 });

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

  const formatLocalDateTime = (value) => {
    if (!value) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const toApiDateTime = (value) => {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  };

  const toDateTimeLocalInputValue = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const buildThresholdEventData = (readings, sensor) => {
    const warningLow = sensor?.warning_low !== null && sensor?.warning_low !== '' ? Number(sensor.warning_low) : null;
    const warningHigh = sensor?.warning_high !== null && sensor?.warning_high !== '' ? Number(sensor.warning_high) : null;
    const alertLow = sensor?.alert_low !== null && sensor?.alert_low !== '' ? Number(sensor.alert_low) : null;
    const alertHigh = sensor?.alert_high !== null && sensor?.alert_high !== '' ? Number(sensor.alert_high) : null;

    return {
      hasAnyThreshold: [warningLow, warningHigh, alertLow, alertHigh].some((value) => value !== null),
      data: readings.map((item) => ({
        time: item.time,
        localTime: formatChartTime(item.time),
        localDateTime: formatLocalDateTime(item.time),
        warningLowEvent: warningLow !== null && Number(item.value) <= warningLow ? 1 : 0,
        warningHighEvent: warningHigh !== null && Number(item.value) >= warningHigh ? 1 : 0,
        alertLowEvent: alertLow !== null && Number(item.value) <= alertLow ? 1 : 0,
        alertHighEvent: alertHigh !== null && Number(item.value) >= alertHigh ? 1 : 0,
      })),
    };
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
          start: toApiDateTime(startDate || dateRange.start),
          end: toApiDateTime(endDate || dateRange.end),
        },
      });

      const formattedData = response.data.map((item) => ({
        time: item.time,
        localTime: formatChartTime(item.time),
        localDateTime: formatLocalDateTime(item.time),
        value: Number.parseFloat(item.value),
        unit: item.unit || '',
      }));

      setSensorMeasurements(formattedData);
      setMeasurementBrushRange({
        startIndex: 0,
        endIndex: Math.max(formattedData.length - 1, 0),
      });
      console.log('Frontend: Fetched sensor measurements:', formattedData);
    } catch (err) {
      console.error('Frontend: Error fetching sensor measurements:', err);
      setError('Error al cargar las mediciones de sensores.');
    }
  };

  const fetchSensorEvents = async (sensorIds = selectedEventSensorIds, sensorList = sensors) => {
    const limitedSensorIds = (sensorIds || []).slice(0, 5);
    console.log('Frontend: Fetching sensor threshold events with date range:', dateRange, limitedSensorIds);

    if (limitedSensorIds.length === 0) {
      setEventSensorSeries([]);
      setSensorEvents([]);
      return;
    }

    setEventSeriesLoading(true);

    try {
      const responses = await Promise.all(
        limitedSensorIds.map((sensorId) =>
          api.get(`/sensors/${sensorId}/readings`, {
            params: {
              start: toApiDateTime(dateRange.start),
              end: toApiDateTime(dateRange.end),
            },
          })
        )
      );

      const series = limitedSensorIds.map((sensorId, index) => {
        const sensor = sensorList.find((item) => String(item.id) === String(sensorId));
        const thresholdData = buildThresholdEventData(responses[index].data || [], sensor);

        return {
          sensorId: String(sensorId),
          tag_name: sensor?.tag_name || `Sensor ${sensorId}`,
          plc_nombre: sensor?.plc_nombre || 'N/A',
          warning_low: sensor?.warning_low,
          warning_high: sensor?.warning_high,
          alert_low: sensor?.alert_low,
          alert_high: sensor?.alert_high,
          ...thresholdData,
        };
      });

      setEventSensorSeries(series);
      setSensorEvents(
        series.flatMap((seriesItem) =>
          seriesItem.data.map((item) => ({
            sensor_tag_name: seriesItem.tag_name,
            plc_nombre: seriesItem.plc_nombre,
            time: item.localDateTime,
            warning_low_event: item.warningLowEvent,
            warning_high_event: item.warningHighEvent,
            alert_low_event: item.alertLowEvent,
            alert_high_event: item.alertHighEvent,
          }))
        )
      );
      console.log('Frontend: Fetched sensor threshold events:', series);
    } catch (err) {
      console.error('Frontend: Error fetching sensor threshold events:', err);
      setError('Error al cargar los eventos de sensores.');
    } finally {
      setEventSeriesLoading(false);
    }
  };

  const fetchActuatorActions = async () => {
    console.log('Frontend: Fetching actuator actions with date range:', dateRange);

    try {
      const response = await api.get('/actuator-actions', {
        params: {
          start: toApiDateTime(dateRange.start),
          end: toApiDateTime(dateRange.end),
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
          start: toApiDateTime(dateRange.start),
          end: toApiDateTime(dateRange.end),
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
      const allSensors = sensorsResponse.data || [];
      const firstSensorId = allSensors[0]?.id || '';
      const initialEventSensorIds = firstSensorId ? [String(firstSensorId)] : [];

      setSensors(allSensors);
      setSelectedSensorId(firstSensorId);
      setSelectedEventSensorIds(initialEventSensorIds);
      console.log('Frontend: Fetched sensors:', allSensors);

      if (firstSensorId) {
        await fetchSensorMeasurements(firstSensorId, dateRange.start, dateRange.end);
      } else {
        setSensorMeasurements([]);
        console.log('Frontend: No sensors found, clearing measurements.');
      }

      await fetchSensorEvents(initialEventSensorIds, allSensors);
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

    fetchSensorEvents(selectedEventSensorIds);
    fetchActuatorActions();
    fetchAuditLogs();
    console.log('Frontend: Fetching data for updated filters.');
  }, [initialized, selectedSensorId, dateRange.start, dateRange.end, selectedEventSensorIds]);

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar.');
      console.log('Frontend: Export to CSV called, but no data provided.');
      return;
    }

    const selectedSensor = sensors.find((sensor) => sensor.id === selectedSensorId);
    const enrichedData = data.map((row) => {
      const sensorFromRow = row.sensor_name
        ? sensors.find((sensor) => sensor.tag_name === row.sensor_name)
        : selectedSensor;

      return {
        sensor_tag_name: sensorFromRow?.tag_name || selectedSensor?.tag_name || 'N/A',
        plc_nombre: sensorFromRow?.plc_nombre || selectedSensor?.plc_nombre || 'N/A',
        ...Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            if (key === 'time' || key === 'timestamp') {
              return [key, formatLocalDateTime(value)];
            }
            return [key, value];
          })
        ),
      };
    });

    console.log(`Frontend: Exporting ${data.length} rows to CSV: ${filename}.csv`);
    const csvRows = [];
    const headers = Object.keys(enrichedData[0]);
    csvRows.push(headers.join(','));

    for (const row of enrichedData) {
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

  const selectedSensor = sensors.find((sensor) => String(sensor.id) === String(selectedSensorId));

  const getMeasurementStatus = (value) => {
    if (!selectedSensor || value === null || value === undefined) {
      return 'normal';
    }

    const alertLow = selectedSensor.alert_low !== null && selectedSensor.alert_low !== '' ? Number(selectedSensor.alert_low) : null;
    const alertHigh = selectedSensor.alert_high !== null && selectedSensor.alert_high !== '' ? Number(selectedSensor.alert_high) : null;
    const warningLow = selectedSensor.warning_low !== null && selectedSensor.warning_low !== '' ? Number(selectedSensor.warning_low) : null;
    const warningHigh = selectedSensor.warning_high !== null && selectedSensor.warning_high !== '' ? Number(selectedSensor.warning_high) : null;

    if ((alertLow !== null && value <= alertLow) || (alertHigh !== null && value >= alertHigh)) {
      return 'alert';
    }

    if ((warningLow !== null && value <= warningLow) || (warningHigh !== null && value >= warningHigh)) {
      return 'warning';
    }

    return 'normal';
  };

  const chartData = useMemo(() => {
    const nextChartData = sensorMeasurements.map((item) => {
      const status = getMeasurementStatus(item.value);
      return {
        ...item,
        status,
        normalValue: status === 'normal' ? item.value : null,
        warningValue: status === 'warning' ? item.value : null,
        alertValue: status === 'alert' ? item.value : null,
      };
    });

    for (let i = 1; i < nextChartData.length; i += 1) {
      const previousPoint = nextChartData[i - 1];
      const currentPoint = nextChartData[i];

      if (previousPoint.status === currentPoint.status) {
        continue;
      }

      if (previousPoint.status === 'normal') {
        currentPoint.normalValue = currentPoint.value;
      } else if (previousPoint.status === 'warning') {
        currentPoint.warningValue = currentPoint.value;
      } else if (previousPoint.status === 'alert') {
        currentPoint.alertValue = currentPoint.value;
      }

      if (currentPoint.status === 'normal') {
        previousPoint.normalValue = previousPoint.value;
      } else if (currentPoint.status === 'warning') {
        previousPoint.warningValue = previousPoint.value;
      } else if (currentPoint.status === 'alert') {
        previousPoint.alertValue = previousPoint.value;
      }
    }

    return nextChartData;
  }, [sensorMeasurements, selectedSensor]);

  const visibleMeasurementRange = useMemo(() => {
    if (chartData.length === 0) {
      return { startTime: null, endTime: null, data: [] };
    }

    const safeStartIndex = Math.max(0, Math.min(measurementBrushRange.startIndex, chartData.length - 1));
    const safeEndIndex = Math.max(safeStartIndex, Math.min(measurementBrushRange.endIndex, chartData.length - 1));
    const data = chartData.slice(safeStartIndex, safeEndIndex + 1);

    return {
      startTime: data[0]?.time || null,
      endTime: data[data.length - 1]?.time || null,
      data,
    };
  }, [chartData, measurementBrushRange]);

  const filteredEventSensorSeries = useMemo(
    () =>
      eventSensorSeries.map((seriesItem) => ({
        ...seriesItem,
        data: seriesItem.data.filter((item) => {
          if (!visibleMeasurementRange.startTime || !visibleMeasurementRange.endTime) {
            return true;
          }

          return item.time >= visibleMeasurementRange.startTime && item.time <= visibleMeasurementRange.endTime;
        }),
      })),
    [eventSensorSeries, visibleMeasurementRange]
  );

  const measurementStats = useMemo(() => {
    if (visibleMeasurementRange.data.length === 0) {
      return null;
    }

    const values = visibleMeasurementRange.data
      .map((item) => item.value)
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return null;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

    return { min, max, avg };
  }, [visibleMeasurementRange]);

  const getOrderedThresholdDefinitions = (sensorLike) => {
    const thresholds = [
      {
        key: 'warningLowEvent',
        label: 'Warning Bajo',
        rawValue: sensorLike?.warning_low,
        color: '#d946ef',
      },
      {
        key: 'warningHighEvent',
        label: 'Warning Alto',
        rawValue: sensorLike?.warning_high,
        color: '#f59e0b',
      },
      {
        key: 'alertLowEvent',
        label: 'Alerta Baja',
        rawValue: sensorLike?.alert_low,
        color: '#1e3a8a',
      },
      {
        key: 'alertHighEvent',
        label: 'Alerta Alta',
        rawValue: sensorLike?.alert_high,
        color: '#dc2626',
      },
    ];

    return thresholds
      .filter((item) => item.rawValue !== null && item.rawValue !== '')
      .map((item) => ({
        ...item,
        numericValue: Number(item.rawValue),
      }))
      .sort((a, b) => a.numericValue - b.numericValue);
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

  const handleEventSensorSelectionChange = (event) => {
    const nextIds = event.target.value.slice(0, 5);
    setSelectedEventSensorIds(nextIds);
    setEventSelectionWarning(
      event.target.value.length > 5 ? 'Solo se pueden visualizar hasta 5 sensores al mismo tiempo.' : ''
    );
  };

  const handleMeasurementBrushChange = (range) => {
    if (!range || range.startIndex === undefined || range.endIndex === undefined) {
      return;
    }

    setMeasurementBrushRange({
      startIndex: range.startIndex,
      endIndex: range.endIndex,
    });
  };

  const applyQuickRange = (hours) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

    setDateRange({
      start: toDateTimeLocalInputValue(start),
      end: toDateTimeLocalInputValue(end),
    });
  };

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
                    {sensor.tag_name}{sensor.activo ? '' : ' (OFF)'}
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
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="textSecondary" sx={{ alignSelf: 'center', mr: 1 }}>
                Rangos rapidos:
              </Typography>
              <MenuItem sx={{ borderRadius: 1 }} onClick={() => applyQuickRange(1)}>1h</MenuItem>
              <MenuItem sx={{ borderRadius: 1 }} onClick={() => applyQuickRange(8)}>8h</MenuItem>
              <MenuItem sx={{ borderRadius: 1 }} onClick={() => applyQuickRange(24)}>24h</MenuItem>
              <MenuItem sx={{ borderRadius: 1 }} onClick={() => applyQuickRange(24 * 7)}>7d</MenuItem>
              <MenuItem
                sx={{ borderRadius: 1 }}
                onClick={() => setDateRange({ start: '', end: '' })}
              >
                Limpiar
              </MenuItem>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Mediciones de Sensores
            {selectedSensorId && selectedSensor && (
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                ({selectedSensor?.tag_name} - {selectedSensor?.unidad_medida || ''})
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
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="localTime"
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  height={80}
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
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.localDateTime || label}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 12 }} />
                <Line
                  type="monotone"
                  dataKey="normalValue"
                  stroke="#10b981"
                  activeDot={{ r: 5 }}
                  dot={false}
                  strokeWidth={2}
                  name="Normal"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="warningValue"
                  stroke="#f59e0b"
                  activeDot={{ r: 5 }}
                  dot={false}
                  strokeWidth={2}
                  name="Warning"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="alertValue"
                  stroke="#ef4444"
                  activeDot={{ r: 5 }}
                  dot={false}
                  strokeWidth={2}
                  name="Alerta"
                  connectNulls={false}
                />
                <Brush
                  dataKey="localTime"
                  height={24}
                  stroke="#64748b"
                  travellerWidth={10}
                  onChange={handleMeasurementBrushChange}
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
        {measurementStats && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <Typography variant="caption" color="textSecondary">Minimo</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {measurementStats.min.toFixed(2)} {getYAxisUnit()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <Typography variant="caption" color="textSecondary">Maximo</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {measurementStats.max.toFixed(2)} {getYAxisUnit()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <Typography variant="caption" color="textSecondary">Promedio</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {measurementStats.avg.toFixed(2)} {getYAxisUnit()}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
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
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="event-sensor-select-label">Sensores para eventos</InputLabel>
              <Select
                labelId="event-sensor-select-label"
                multiple
                value={selectedEventSensorIds}
                label="Sensores para eventos"
                onChange={handleEventSensorSelectionChange}
                renderValue={(selected) =>
                  selected
                    .map((sensorId) => sensors.find((sensor) => String(sensor.id) === String(sensorId))?.tag_name || sensorId)
                    .join(', ')
                }
              >
                {sensors.map((sensor) => (
                  <MenuItem key={sensor.id} value={String(sensor.id)}>
                    <Checkbox checked={selectedEventSensorIds.includes(String(sensor.id))} />
                    <ListItemText primary={`${sensor.tag_name}${sensor.activo ? '' : ' (OFF)'}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {eventSelectionWarning && <Alert severity="warning" sx={{ mb: 2 }}>{eventSelectionWarning}</Alert>}
        <Box sx={{ maxHeight: 700, overflowY: 'auto', pr: 1 }}>
          {eventSeriesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredEventSensorSeries.length > 0 ? (
            filteredEventSensorSeries.map((seriesItem) => (
              <Paper key={seriesItem.sensorId} variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                {(() => {
                  const orderedThresholds = getOrderedThresholdDefinitions(seriesItem);
                  return (
                    <>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 0.5 }}>
                  {seriesItem.tag_name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {seriesItem.plc_nombre}
                </Typography>
                {seriesItem.hasAnyThreshold ? (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                      {orderedThresholds.map((threshold) => (
                        <Typography key={threshold.key} variant="caption" sx={{ color: threshold.color, fontWeight: 'bold' }}>
                          {threshold.label} ({threshold.rawValue})
                        </Typography>
                      ))}
                    </Box>
                    <Box sx={{ height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seriesItem.data} margin={{ top: 5, right: 30, left: 20, bottom: 55 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="localTime"
                          stroke="#64748b"
                          angle={-45}
                          textAnchor="end"
                          interval="preserveStartEnd"
                          height={70}
                        />
                        <YAxis stroke="#64748b" domain={[0, 1]} ticks={[0, 1]} allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => (Number(value) === 1 ? 'Activo' : 'Inactivo')}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.localDateTime || label}
                        />
                        {orderedThresholds.map((threshold) => (
                          <Line
                            key={threshold.key}
                            type="stepAfter"
                            dataKey={threshold.key}
                            stroke={threshold.color}
                            dot={false}
                            strokeWidth={2}
                            name={`${threshold.label} (${threshold.rawValue})`}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    Este sensor no tiene umbrales de warning o alerta configurados.
                  </Typography>
                )}
                {seriesItem.hasAnyThreshold && seriesItem.data.length === 0 && (
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    Sin eventos visibles dentro del rango seleccionado en la grafica principal.
                  </Typography>
                )}
                    </>
                  );
                })()}
              </Paper>
            ))
          ) : (
            <Typography color="textSecondary">Selecciona hasta 5 sensores para ver sus eventos de umbral.</Typography>
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
