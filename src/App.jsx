import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

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
              <Route path="historicos" element={<Typography variant="h4">Históricos (Próximamente)</Typography>} />
              <Route path="config/plcs" element={<Typography variant="h4">Configuración PLC (Próximamente)</Typography>} />
              <Route path="config/sensores" element={<Typography variant="h4">Caja de Ajustes (Próximamente)</Typography>} />
              <Route path="admin/usuarios" element={<Typography variant="h4">Gestión Usuarios (Próximamente)</Typography>} />
              <Route path="settings" element={<Typography variant="h4">Ajustes App (Próximamente)</Typography>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
