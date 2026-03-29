import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  ExitToApp as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  Sensors as SensorsIcon,
  SettingsInputComponent as PLCSIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Solo móviles reales
  const [open, setOpen] = useState(!isMobile); // Cerrado en móvil, abierto en escritorio
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const menuItems = [
    { text: 'Dashboard HMI', icon: <DashboardIcon />, path: '/', roles: ['ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN'] },
    { text: 'Históricos', icon: <HistoryIcon />, path: '/historicos', roles: ['ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN'] },
    { text: 'Configuración PLC', icon: <PLCSIcon />, path: '/config/plcs', roles: ['ADMIN', 'DEVELOPER'] },
    { text: 'Caja de Ajustes', icon: <SensorsIcon />, path: '/config/sensores', roles: ['ADMIN', 'DEVELOPER', 'LIDER'] },
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/admin/usuarios', roles: ['ADMIN'] },
    { text: 'Ajustes App', icon: <SettingsIcon />, path: '/settings', roles: ['ADMIN'] },
  ];

  // Filtrar menú por rol
  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#1e293b', // Azul marino industrial
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            AppLGVektorData | <span style={{ fontWeight: 'normal', fontSize: '0.8em', opacity: 0.8 }}>Industria 4.0</span>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.full_name} ({user?.role})
            </Typography>
            <IconButton color="inherit" onClick={logout} title="Cerrar Sesión">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
        ModalProps={{
          keepMounted: true, // Mejor rendimiento en móviles
          hideBackdrop: true, // <--- SOLUCIÓN: El backdrop NUNCA aparecerá
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            backgroundColor: '#0f172a', // Fondo oscuro sideral
            color: '#cbd5e1',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)'
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 1 }}>
          <List>
            {filteredMenu.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      color: '#38bdf8',
                      '& .MuiListItemIcon-root': { color: '#38bdf8' }
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: '#64748b' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        </Box>
      </Drawer>
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          backgroundColor: '#f8fafc', // Fondo blanco humo
          minHeight: '100vh',
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && !isMobile && {
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
          })
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
