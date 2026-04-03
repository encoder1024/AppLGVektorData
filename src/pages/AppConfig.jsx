import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Switch,
  Typography as MuiTypography,
} from "@mui/material";
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import api from "../services/api";
import Barometer from "../components/instruments/Barometer";
// import TestInstruments from "../components/instruments/TestInstruments";
import CalderaInteractiva from "../components/systems/Caldera";

const AppConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [angulo, setAngulo] = useState(0);

  // Agrupamos la configuración por temas
  const [config, setConfig] = useState({
    connection_mode: "local",
    db_local_url: "postgresql://user:pass@localhost:5432/industry_db",
    db_remote_url: "postgresql://admin:securepass@cloud-server.com",
    use_remote_db: false,
    scan_rate_default_ms: 1000,
    company_name: "LG Vektor Data",
    admin_email: "admin@lgvektor.com",
    retention_policy_days: 30,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await api.get("/config");
        if (response.data && response.data.length > 0) {
          const newConfig = { ...config };
          response.data.forEach((item) => {
            newConfig[item.key] = item.value;
          });
          setConfig(newConfig);
        }
      } catch (err) {
        setError(
          "Error al cargar la configuración. Asegúrate de tener permisos.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async (key) => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await api.post("/config", { key, value: config[key] });
      setSuccess(`Configuración '${key}' guardada con éxito`);
    } catch (err) {
      setError(`Error al guardar '${key}'`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      // Guardamos todas las claves secuencialmente o en paralelo
      const promises = Object.keys(config).map((key) =>
        api.post("/config", { key, value: config[key] }),
      );
      await Promise.all(promises);
      setSuccess("Toda la configuración ha sido guardada con éxito");
    } catch (err) {
      setError("Error al guardar la configuración completa");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <div>
        <CalderaInteractiva datosSensores={{ temperatura: 90, presion: 10 }} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          padding: "40px",
        }}
      >
        <h2>Control de Barómetro</h2>

        {/* Componente del Barómetro */}
        <Barometer valor={angulo} size={200} />

        {/* Slider para mover la aguja */}
        <div style={{ width: "300px", textAlign: "center" }}>
          <p>
            Ángulo actual: <strong>{angulo}°</strong>
          </p>
          <input
            type="range"
            min="0"
            max="360"
            value={angulo}
            onChange={(e) => setAngulo(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
            }}
          >
            <button onClick={() => setAngulo(0)}>Min</button>
            <button onClick={() => setAngulo(136)}>Centro</button>
            <button onClick={() => setAngulo(271)}>Max</button>
          </div>
        </div>
      </div>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1e293b" }}>
          Configuración del Sistema
        </Typography>
        <Button
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSaveAll}
          disabled={saving}
        >
          Guardar Todo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sección de Conectividad */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Conectividad y Base de Datos"
              subheader="Configura cómo se conecta la aplicación al hardware y a la base de datos"
              avatar={<SettingsIcon color="primary" />}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  name="connection_mode"
                  label="Modo de Conexión"
                  value={config.connection_mode}
                  onChange={handleChange}
                  helperText="Define si el backend actúa como servidor local o remoto"
                >
                  <MenuItem value="local">Local (Edge Gateway)</MenuItem>
                  <MenuItem value="remote">Remoto (Cloud/Server)</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  name="db_local_url"
                  label="URL Base de Datos Local"
                  value={config.db_local_url}
                  onChange={handleChange}
                  placeholder="postgresql://user:pass@localhost:5432/db"
                />

                <TextField
                  fullWidth
                  name="db_remote_url"
                  label="URL Base de Datos Remota"
                  value={config.db_remote_url}
                  onChange={handleChange}
                  placeholder="postgresql://admin:secure@remote-host:5432/db"
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="use_remote_db"
                      checked={config.use_remote_db}
                      onChange={handleChange}
                    />
                  }
                  label="Usar Base de Datos Remota por defecto"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sección de Operación Industrial */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Parámetros de Operación"
              subheader="Ajustes por defecto para la adquisición de datos"
              avatar={<SettingsIcon color="secondary" />}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  name="scan_rate_default_ms"
                  label="Scan Rate por defecto (ms)"
                  type="number"
                  value={config.scan_rate_default_ms}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  name="retention_policy_days"
                  label="Días de retención de datos históricos"
                  type="number"
                  value={config.retention_policy_days}
                  onChange={handleChange}
                  helperText="Días antes de comprimir o purgar datos antiguos en TimescaleDB"
                />
              </Box>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ mt: 3 }}>
            <CardHeader
              title="Información de la Empresa"
              avatar={<SettingsIcon color="action" />}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  name="company_name"
                  label="Nombre de la Empresa / Planta"
                  value={config.company_name}
                  onChange={handleChange}
                />
                <TextField
                  fullWidth
                  name="admin_email"
                  label="Email de Notificaciones Críticas"
                  value={config.admin_email}
                  onChange={handleChange}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppConfig;
