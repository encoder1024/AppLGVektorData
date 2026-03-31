import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ConfigPLCs from './pages/ConfigPLCs';
import ConfigSensores from './pages/ConfigSensores';
import ConfigCalibration from './pages/ConfigCalibration';
import ConfigActuadores from './pages/ConfigActuadores';
import Historicos from './pages/Historicos'; // Importar el nuevo componente Historicos
import SaludSistema from './pages/SaludSistema';
import Usuarios from './pages/Usuarios';
import AppConfig from './pages/AppConfig';

// Tema personalizado industrial
const theme = createTheme({
  palette: {
    primary: { main: '#1e293b' }, // Azul marino industrial
    secondary: { main: '#38bdf8' }, // Celeste tecnológico
    background: { default: '#f8fafc' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
      },
    },
  },
});

// Componente para proteger rutas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // O un spinner
  return user ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return roles.includes(user.role) ? children : <Navigate to="/" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="salud-sistema" element={<RoleRoute roles={['DEVELOPER', 'ADMIN']}><SaludSistema /></RoleRoute>} />
              <Route path="historicos" element={<Historicos />} /> {/* Usar el componente Historicos */}
              <Route path="config/plcs" element={<ConfigPLCs />} />
              <Route path="config/calibracion" element={<ConfigCalibration />} />
              <Route path="config/sensores" element={<ConfigSensores />} />
              <Route path="config/actuadores" element={<ConfigActuadores />} />
              <Route path="admin/usuarios" element={<RoleRoute roles={['ADMIN']}><Usuarios /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute roles={['ADMIN']}><AppConfig /></RoleRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
