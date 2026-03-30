import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert, 
  MenuItem,
  CircularProgress
} from '@mui/material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'TECHNICIAN'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/signup', formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0f172a'
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', m: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}>
            Crear Cuenta
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 4, textAlign: 'center' }}>
            Registro de personal industrial
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>¡Registro exitoso! Redirigiendo...</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="full_name"
              label="Nombre Completo"
              margin="normal"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              name="email"
              label="Correo Electrónico"
              margin="normal"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              name="password"
              label="Contraseña"
              margin="normal"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              select
              name="role"
              label="Rol Solicitado"
              margin="normal"
              value={formData.role}
              onChange={handleChange}
            >
              <MenuItem value="TECHNICIAN">Technician</MenuItem>
              <MenuItem value="DEVELOPER">Developer</MenuItem>
              <MenuItem value="LIDER">Lider</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>
            
            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loading}
              sx={{ mt: 4, py: 1.5, backgroundColor: '#1e293b' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Registrarse'}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/login')}
              sx={{ mt: 1 }}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Signup;
