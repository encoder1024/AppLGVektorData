import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import ReactECharts from 'echarts-for-react';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import api from '../services/api';

const getDefaultLastHourRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);

  const toDateTimeLocalInputValue = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return {
    start: toDateTimeLocalInputValue(start),
    end: toDateTimeLocalInputValue(end),
  };
};

const Historicos = () => {
  const [sensors, setSensors] = useState([]);
  const [sensorMeasurements, setSensorMeasurements] = useState([]);
  const [sensorEvents, setSensorEvents] = useState([]);
  const [eventSensorSeries, setEventSensorSeries] = useState([]);
  const [eventSeriesLoading, setEventSeriesLoading] = useState(false);
  const [selectedEventSensorIds, setSelectedEventSensorIds] = useState([]);
  const [actuatorActions, setActuatorActions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [dateRange, setDateRange] = useState(() => getDefaultLastHourRange());
  const chartRef = useRef(null);

  const formatChartTime = (tickItem) => {
    try {
      const date = new Date(tickItem);
      if (Number.isNaN(date.getTime())) return tickItem;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return tickItem;
    }
  };

  const formatLocalDateTime = (value) => {
    if (!value) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const toApiDateTime = (value) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
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

  const applyQuickRange = (hours) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setDateRange({
      start: toDateTimeLocalInputValue(start),
      end: toDateTimeLocalInputValue(end),
    });
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
        warningLowEvent: warningLow !== null && Number(item.value) <= warningLow ? 1 : 0,
        warningHighEvent: warningHigh !== null && Number(item.value) >= warningHigh ? 1 : 0,
        alertLowEvent: alertLow !== null && Number(item.value) <= alertLow ? 1 : 0,
        alertHighEvent: alertHigh !== null && Number(item.value) >= alertHigh ? 1 : 0,
      })),
    };
  };

  const parseActuatorActionState = (action) => {
    const details = typeof action?.details === 'string' ? (() => { try { return JSON.parse(action.details); } catch (e) { return {}; } })() : action?.details || {};
    const candidateValue = [action?.state, action?.value, details.state, details.value, details.newValue, details.output, details.enabled].find((v) => v !== undefined && v !== null);
    if (typeof candidateValue === 'boolean') return candidateValue ? 1 : 0;
    if (typeof candidateValue === 'number') return candidateValue !== 0 ? 1 : 0;
    if (typeof candidateValue === 'string') {
      const norm = candidateValue.trim().toUpperCase();
      if (['1', 'TRUE', 'ON', 'OPEN', 'START', 'ENABLE', 'ENABLED', 'HIGH'].includes(norm)) return 1;
      if (['0', 'FALSE', 'OFF', 'CLOSE', 'STOP', 'DISABLE', 'LOW'].includes(norm)) return 0;
    }
    return action?.action_type === 'PULSE' ? 1 : 0;
  };

  const fetchSensorMeasurements = async (sensorId, startDate, endDate) => {
    if (!sensorId) { setSensorMeasurements([]); return; }
    try {
      const s = startDate || dateRange.start;
      const e = endDate || dateRange.end;
      
      let shouldDownsample = true;
      if (s && e) {
        const diffMs = new Date(e) - new Date(s);
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < 2) shouldDownsample = false; // Downsample mas agresivo: promediar a partir de 2 horas
      }

      const response = await api.get(`/sensors/${sensorId}/readings`, {
        params: { 
          start: toApiDateTime(s), 
          end: toApiDateTime(e), 
          downsample: shouldDownsample 
        },
      });

      const rawData = response.data.map(item => ({ ...item, value: Number.parseFloat(item.value) }));
      setSensorMeasurements(rawData);
    } catch (err) {
      console.error('Error fetching sensor measurements:', err);
      setError('Error al cargar mediciones.');
    }
  };

  const fillDataGaps = (readings, startDate, endDate, shouldDownsample) => {
    if (!readings || readings.length === 0) return [];

    // 1. Determinar intervalo esperado entre puntos
    let intervalMs = 1000;
    if (shouldDownsample && startDate && endDate) {
      const diffMs = new Date(endDate) - new Date(startDate);
      const totalSeconds = diffMs / 1000;
      const bucketSeconds = Math.max(1, Math.ceil(totalSeconds / 1000)); // Apuntamos a ~1000 puntos
      intervalMs = bucketSeconds * 1000;
    } else if (readings.length > 1) {
      const diffs = [];
      for (let i = 1; i < Math.min(readings.length, 20); i++) {
        const d = new Date(readings[i].time) - new Date(readings[i - 1].time);
        if (d > 0) diffs.push(d);
      }
      if (diffs.length > 0) {
        diffs.sort((a, b) => a - b);
        intervalMs = diffs[Math.floor(diffs.length / 2)];
      }
    }

    // Definimos un umbral de 3 veces el intervalo para considerar que hay un "hueco"
    const threshold = Math.max(intervalMs * 3, 5000); 
    const result = [];

    for (let i = 0; i < readings.length; i++) {
      const current = readings[i];
      const currentTime = new Date(current.time).getTime();

      if (i > 0) {
        const prev = readings[i - 1];
        const prevTime = new Date(prev.time).getTime();
        const diff = currentTime - prevTime;

        if (diff > threshold) {
          // Insertamos ceros para que la curva caiga y se mantenga en cero durante el gap
          result.push({
            ...current,
            time: new Date(prevTime + intervalMs).toISOString(),
            value: 0,
            isGap: true,
          });
          result.push({
            ...current,
            time: new Date(currentTime - intervalMs).toISOString(),
            value: 0,
            isGap: true,
          });
        }
      }
      result.push(current);
    }
    return result;
  };

  const bucketizeData = (data, targetPoints = 1000) => {
    if (!data || data.length <= targetPoints) return data;

    const first = new Date(data[0].time).getTime();
    const last = new Date(data[data.length - 1].time).getTime();
    const interval = (last - first) / targetPoints;
    
    const buckets = new Map();
    
    data.forEach(item => {
      const t = new Date(item.time).getTime();
      const bucketIdx = Math.floor((t - first) / interval);
      const bucketTime = first + bucketIdx * interval;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { sum: 0, count: 0, ...item, time: new Date(bucketTime).toISOString() });
      }
      const b = buckets.get(bucketTime);
      b.sum += item.value;
      b.count += 1;
    });

    return Array.from(buckets.values()).map(b => ({
      ...b,
      value: b.sum / b.count
    })).sort((a, b) => new Date(a.time) - new Date(b.time));
  };

  const fetchSensorEvents = async (sensorIds = selectedEventSensorIds, sensorList = sensors) => {
    const limitedIds = (sensorIds || []).slice(0, 5);
    if (limitedIds.length === 0) { setEventSensorSeries([]); return; }

    let shouldDownsample = true;
    if (dateRange.start && dateRange.end) {
      const diffMs = new Date(dateRange.end) - new Date(dateRange.start);
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 8) shouldDownsample = false;
    }

    setEventSeriesLoading(true);
    try {
      const responses = await Promise.all(limitedIds.map(id => api.get(`/sensors/${id}/readings`, {
        params: { 
          start: toApiDateTime(dateRange.start), 
          end: toApiDateTime(dateRange.end), 
          downsample: shouldDownsample 
        },
      })));
      const series = limitedIds.map((id, index) => {
        const sensor = sensorList.find(s => String(s.id) === String(id));
        const rawReadings = (responses[index].data || []).map(r => ({ ...r, value: Number(r.value) }));
        const filledReadings = fillDataGaps(rawReadings, dateRange.start, dateRange.end, shouldDownsample);
        
        return {
          sensorId: String(id), tag_name: sensor?.tag_name || `Sensor ${id}`,
          plc_nombre: sensor?.plc_nombre || 'N/A',
          warning_low: sensor?.warning_low, warning_high: sensor?.warning_high,
          alert_low: sensor?.alert_low, alert_high: sensor?.alert_high,
          ...buildThresholdEventData(filledReadings, sensor),
        };
      });
      setEventSensorSeries(series);
    } catch (err) {
      console.error('Error fetching sensor events:', err);
    } finally { setEventSeriesLoading(false); }
  };

  const fetchActuatorActions = async () => {
    try {
      const response = await api.get('/actuator-actions', { params: { start: toApiDateTime(dateRange.start), end: toApiDateTime(dateRange.end) } });
      setActuatorActions(response.data.map(item => ({ ...item, rawTimestamp: item.timestamp })));
    } catch (err) { console.error('Error fetching actuator actions:', err); }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/audit-logs', { params: { start: toApiDateTime(dateRange.start), end: toApiDateTime(dateRange.end) } });
      setAuditLogs(response.data.map(item => ({ ...item, timestamp: formatLocalDateTime(item.time) })));
    } catch (err) { console.error('Error fetching audit logs:', err); }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const sensorsRes = await api.get('/sensors');
      const allSensors = sensorsRes.data || [];
      const firstId = allSensors[0]?.id || '';
      setSensors(allSensors);
      setSelectedSensorId(firstId);
      setSelectedEventSensorIds(firstId ? [String(firstId)] : []);
      if (firstId) await fetchSensorMeasurements(firstId, dateRange.start, dateRange.end);
      await fetchSensorEvents(firstId ? [String(firstId)] : [], allSensors);
      await fetchActuatorActions();
      await fetchAuditLogs();
    } catch (err) {
      setError('Error al cargar datos iniciales.');
    } finally { setInitialized(true); setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!initialized) return;
    if (selectedSensorId) fetchSensorMeasurements(selectedSensorId, dateRange.start, dateRange.end);
    fetchSensorEvents(selectedEventSensorIds);
    fetchActuatorActions();
    fetchAuditLogs();
  }, [initialized, selectedSensorId, dateRange.start, dateRange.end, selectedEventSensorIds]);

  const handleExportSensors = async () => {
    if (!selectedSensorId) return;
    setLoading(true);
    try {
      const res = await api.get(`/sensors/${selectedSensorId}/readings`, { params: { start: toApiDateTime(dateRange.start), end: toApiDateTime(dateRange.end), downsample: false } });
      exportToCSV(res.data, `mediciones_${selectedSensor?.tag_name || 'sensor'}`);
    } catch (err) { alert('Error al exportar.'); } finally { setLoading(false); }
  };

  const handleExportEvents = async () => {
    if (selectedEventSensorIds.length === 0) return;
    setLoading(true);
    try {
      const limitedIds = selectedEventSensorIds.slice(0, 5);
      const responses = await Promise.all(limitedIds.map(id => api.get(`/sensors/${id}/readings`, { params: { start: toApiDateTime(dateRange.start), end: toApiDateTime(dateRange.end), downsample: false } })));
      const allEvents = responses.flatMap((res, index) => {
        const sId = limitedIds[index];
        const s = sensors.find(sen => String(sen.id) === String(sId));
        const tData = buildThresholdEventData(res.data || [], s);
        return tData.data.map(item => ({
          tag_name: s?.tag_name, plc: s?.plc_nombre, time: formatLocalDateTime(item.time),
          wL: item.warningLowEvent, wH: item.warningHighEvent, aL: item.alertLowEvent, aH: item.alertHighEvent
        }));
      });
      exportToCSV(allEvents, 'eventos_completos');
    } catch (err) { alert('Error exportando eventos.'); } finally { setLoading(false); }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) { alert('No hay datos.'); return; }
    const headers = Object.keys(data[0]);
    const csvContent = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  const selectedSensor = sensors.find(s => String(s.id) === String(selectedSensorId));

  const measurementStats = useMemo(() => {
    if (sensorMeasurements.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (let i = 0; i < sensorMeasurements.length; i++) {
      const m = sensorMeasurements[i];
      if (m.isGap) continue; // Ignorar puntos de relleno para las estadisticas reales
      
      const v = m.value;
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
        count++;
      }
    }

    if (count === 0) return null;
    return { min, max, avg: sum / count };
  }, [sensorMeasurements]);

  const actuatorWaveSeries = useMemo(() => {
    if (actuatorActions.length === 0) return [];
    const sorted = [...actuatorActions].sort((a, b) => new Date(a.rawTimestamp) - new Date(b.rawTimestamp));
    const names = [...new Set(sorted.map(a => a.actuator_name).filter(Boolean))];
    return names.map(name => {
      const data = sorted.filter(a => a.actuator_name === name).map(a => [a.rawTimestamp, parseActuatorActionState(a)]);
      return { actuatorName: name, data };
    });
  }, [actuatorActions]);

  const getOrderedThresholdDefinitions = (sensorLike) => {
    return [
      { key: 'warningLowEvent', label: 'W. Bajo', val: sensorLike?.warning_low, color: '#d946ef' },
      { key: 'warningHighEvent', label: 'W. Alto', val: sensorLike?.warning_high, color: '#f59e0b' },
      { key: 'alertLowEvent', label: 'A. Bajo', val: sensorLike?.alert_low, color: '#1e3a8a' },
      { key: 'alertHighEvent', label: 'A. Alto', val: sensorLike?.alert_high, color: '#dc2626' },
    ].filter(t => t.val !== null && t.val !== '').map(t => ({ ...t, nVal: Number(t.val) })).sort((a, b) => a.nVal - b.nVal);
  };

  const getMainChartOption = useMemo(() => {
    if (sensorMeasurements.length === 0) return {};
    
    // 1. Bucketizado manual para limpiar ruido vertical y asegurar un solo punto por slot de tiempo
    const cleanData = bucketizeData(sensorMeasurements, 1000);
    
    // 2. Aplicar relleno de huecos para que caiga a cero cuando no hay datos
    const shouldDownsample = sensorMeasurements.length > 500; 
    const processedReadings = fillDataGaps(cleanData, dateRange.start, dateRange.end, shouldDownsample);
    
    const data = processedReadings.map(m => [m.time, m.value]);
    const wL = selectedSensor?.warning_low ? Number(selectedSensor.warning_low) : null;
    const wH = selectedSensor?.warning_high ? Number(selectedSensor.warning_high) : null;
    const aL = selectedSensor?.alert_low ? Number(selectedSensor.alert_low) : null;
    const aH = selectedSensor?.alert_high ? Number(selectedSensor.alert_high) : null;
    const mAreas = [];
    if (aL !== null) mAreas.push([{ yAxis: -Infinity, itemStyle: { color: 'rgba(239, 68, 68, 0.1)' } }, { yAxis: aL }]);
    if (wL !== null && aL !== null && wL > aL) mAreas.push([{ yAxis: aL, itemStyle: { color: 'rgba(245, 158, 11, 0.1)' } }, { yAxis: wL }]);
    if (wH !== null && aH !== null && aH > wH) mAreas.push([{ yAxis: wH, itemStyle: { color: 'rgba(245, 158, 11, 0.1)' } }, { yAxis: wH }]);
    if (aH !== null) mAreas.push([{ yAxis: aH, itemStyle: { color: 'rgba(239, 68, 68, 0.1)' } }, { yAxis: Infinity }]);

    const isLargeRange = sensorMeasurements.length > 1000;

    return {
      tooltip: { 
        trigger: 'axis',
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const item = params[0]; 
          const val = Array.isArray(item.value) ? item.value[1] : item.value;
          const label = isLargeRange ? `Promedio ${item.seriesName}` : item.seriesName;
          
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${item.axisValueLabel}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${item.marker} ${label}: <b>${Number(val).toFixed(2)}</b>
            </div>
          `;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'time', axisLine: { lineStyle: { color: '#64748b' } } },
      yAxis: { type: 'value', name: selectedSensor?.unidad_medida || 'Valor' },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, height: 20 }],
      animation: !isLargeRange,
      series: [{
        name: 'Lectura', type: 'line', smooth: false, symbol: 'none', data,
        // Ya no necesitamos sampling ni large porque enviamos datos pre-procesados y limpios
        lineStyle: { width: 2, color: '#2563eb' },
        markArea: { silent: true, data: mAreas },
        markLine: {
          silent: true, symbol: 'none',
          data: [
            ...(wL !== null ? [{ yAxis: wL, lineStyle: { color: '#f59e0b', type: 'dashed' } }] : []),
            ...(wH !== null ? [{ yAxis: wH, lineStyle: { color: '#f59e0b', type: 'dashed' } }] : []),
            ...(aL !== null ? [{ yAxis: aL, lineStyle: { color: '#ef4444' } }] : []),
            ...(aH !== null ? [{ yAxis: aH, lineStyle: { color: '#ef4444' } }] : [])
          ]
        }
      }]
    };
  }, [sensorMeasurements, selectedSensor, dateRange.start, dateRange.end]);

  const getEventChartOption = (s) => {
    const thresholds = getOrderedThresholdDefinitions(s);
    const isLargeRange = s.data.length > 500;
    return {
      tooltip: { 
        trigger: 'axis',
        formatter: (params) => {
          let res = `${params[0].axisValueLabel}<br/>`;
          params.forEach(item => {
            const val = Array.isArray(item.value) ? item.value[1] : item.value;
            res += `${item.marker} ${item.seriesName}: <b>${Number(val).toFixed(2)}</b><br/>`;
          });
          return res;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'time' },
      yAxis: { min: 0, max: 1, interval: 1 },
      animation: !isLargeRange,
      series: thresholds.map(t => ({ 
        name: t.label, type: 'line', step: 'end', symbol: 'none', 
        sampling: 'average',
        large: true,
        data: s.data.map(d => [d.time, d[t.key]]), 
        lineStyle: { color: t.color } 
      }))
    };
  };

  const getActuatorChartOption = (s, i) => {
    const color = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#7c3aed', '#0891b2'][i % 6];
    const isLargeRange = s.data.length > 500;
    return {
      tooltip: { 
        trigger: 'axis',
        formatter: (params) => {
          let res = `${params[0].axisValueLabel}<br/>`;
          params.forEach(item => {
            const val = Array.isArray(item.value) ? item.value[1] : item.value;
            res += `${item.marker} ${item.seriesName}: <b>${Number(val).toFixed(2)}</b><br/>`;
          });
          return res;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'time' },
      yAxis: { min: 0, max: 1, interval: 1 },
      animation: !isLargeRange,
      series: [{ 
        name: s.actuatorName, type: 'line', step: 'end', symbol: 'none', 
        sampling: 'average',
        large: true,
        data: s.data, 
        lineStyle: { color }, 
        areaStyle: { color, opacity: 0.1 } 
      }]
    };
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Cargando...</Typography></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e293b' }}>Historicos y Auditoria</Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Filtros</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sensor</InputLabel>
              <Select value={selectedSensorId || ''} label="Sensor" onChange={(e) => setSelectedSensorId(e.target.value)}>
                {sensors.map(s => <MenuItem key={s.id} value={s.id}>{s.tag_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}><TextField label="Inicio" type="datetime-local" fullWidth size="small" InputLabelProps={{ shrink: true }} value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} /></Grid>
          <Grid item xs={12} sm={3}><TextField label="Fin" type="datetime-local" fullWidth size="small" InputLabelProps={{ shrink: true }} value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <MenuItem sx={{ borderRadius: 1, border: '1px solid #e2e8f0' }} onClick={() => applyQuickRange(1)}>1h</MenuItem>
              <MenuItem sx={{ borderRadius: 1, border: '1px solid #e2e8f0' }} onClick={() => applyQuickRange(8)}>8h</MenuItem>
              <MenuItem sx={{ borderRadius: 1, border: '1px solid #e2e8f0' }} onClick={() => applyQuickRange(24)}>24h</MenuItem>
              <MenuItem sx={{ borderRadius: 1, border: '1px solid #e2e8f0' }} onClick={() => applyQuickRange(168)}>7d</MenuItem>
              <MenuItem sx={{ borderRadius: 1, border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => setDateRange({ start: '', end: '' })}>Limpiar</MenuItem>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Mediciones {selectedSensor?.tag_name} {selectedSensor?.unidad_medida && `(${selectedSensor.unidad_medida})`}</Typography>
          <IconButton onClick={handleExportSensors} disabled={sensorMeasurements.length === 0}><DownloadIcon /></IconButton>
        </Box>
        <Box sx={{ height: 450 }}>
          {sensorMeasurements.length > 0 ? <ReactECharts ref={chartRef} option={getMainChartOption} style={{ height: '100%' }} notMerge={true} /> : <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography color="textSecondary">Selecciona un sensor para ver mediciones.</Typography></Box>}
        </Box>
        {measurementStats && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}><Typography variant="caption" color="textSecondary">Minimo</Typography><Typography variant="h6" sx={{ fontWeight: 'bold' }}>{measurementStats.min.toFixed(2)}</Typography></Paper></Grid>
            <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}><Typography variant="caption" color="textSecondary">Maximo</Typography><Typography variant="h6" sx={{ fontWeight: 'bold' }}>{measurementStats.max.toFixed(2)}</Typography></Paper></Grid>
            <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}><Typography variant="caption" color="textSecondary">Promedio</Typography><Typography variant="h6" sx={{ fontWeight: 'bold' }}>{measurementStats.avg.toFixed(2)}</Typography></Paper></Grid>
          </Grid>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Eventos</Typography>
          <IconButton onClick={handleExportEvents} disabled={eventSensorSeries.length === 0}><DownloadIcon /></IconButton>
        </Box>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Sensores</InputLabel>
          <Select multiple value={selectedEventSensorIds} label="Sensores" onChange={(e) => setSelectedEventSensorIds(e.target.value.slice(0, 5))} renderValue={(s) => s.join(', ')}>
            {sensors.map(s => <MenuItem key={s.id} value={String(s.tag_name)}>{s.tag_name}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ maxHeight: 600, overflowY: 'auto', pr: 1 }}>
          {eventSeriesLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box> : 
            eventSensorSeries.map(s => (
              <Paper key={s.sensorId} variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{s.tag_name}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>{s.plc_nombre}</Typography>
                {s.hasAnyThreshold ? (
                  <Box sx={{ mt: 1, height: 220 }}><ReactECharts option={getEventChartOption(s)} style={{ height: '100%', width: '100%' }} /></Box>
                ) : (<Typography color="textSecondary" sx={{ mt: 1 }}>Sin umbrales configurados.</Typography>)}
              </Paper>
            ))}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>Actuadores</Typography>
        <Box sx={{ maxHeight: 500, overflowY: 'auto', pr: 1 }}>
          {actuatorWaveSeries.length > 0 ? 
            actuatorWaveSeries.map((s, i) => (
              <Paper key={s.actuatorName} variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{s.actuatorName}</Typography>
                <Box sx={{ height: 180 }}><ReactECharts option={getActuatorChartOption(s, i)} style={{ height: '100%', width: '100%' }} /></Box>
              </Paper>
            )) : (<Typography color="textSecondary">Sin acciones registradas.</Typography>)}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>Auditoria</Typography>
        <Box sx={{ height: 350, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
              <tr>
                <th style={{ border: '1px solid #e2e8f0', padding: '12px', textAlign: 'left' }}>Timestamp</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '12px', textAlign: 'left' }}>Usuario</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '12px', textAlign: 'left' }}>Accion</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '12px', textAlign: 'left' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '12px' }}>{log.timestamp}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '12px' }}>{log.user_name || 'Sistema'}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '12px' }}>{log.action}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '12px' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Box>
  );
};

export default Historicos;
