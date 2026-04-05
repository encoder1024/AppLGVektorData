import React, { useEffect, useRef, useState } from 'react';
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
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  ExitToApp as LogoutIcon,
  Sensors as SensorsIcon,
  SettingsInputComponent as PLCSIcon,
  Functions as FunctionsIcon,
  ToggleOn as ToggleIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const mainContentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setOpen(false);
  };

  useEffect(() => {
    mainContentRef.current?.focus();
  }, [location.pathname]);

  const menuItems = [
    { text: 'Panel Control', icon: <DashboardIcon />, path: '/', roles: ['ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN'] },
    { text: 'Salud del Sistema', icon: <HealthIcon />, path: '/salud-sistema', roles: ['DEVELOPER', 'ADMIN'] },
    { text: 'Historicos', icon: <HistoryIcon />, path: '/historicos', roles: ['ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN'] },
    { text: 'PLC Configuracion', icon: <PLCSIcon />, path: '/config/plcs', roles: ['ADMIN', 'DEVELOPER'] },
    { text: 'Perfiles Calibracion', icon: <FunctionsIcon />, path: '/config/calibracion', roles: ['ADMIN', 'DEVELOPER'] },
    { text: 'Sensores Configuracion', icon: <SensorsIcon />, path: '/config/sensores', roles: ['ADMIN', 'DEVELOPER', 'LIDER'] },
    { text: 'Actuadores', icon: <ToggleIcon />, path: '/config/actuadores', roles: ['ADMIN', 'DEVELOPER'] },
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/admin/usuarios', roles: ['ADMIN'] },
    { text: 'Ajustes App', icon: <SettingsIcon />, path: '/settings', roles: ['ADMIN'] },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          backgroundColor: '#1e293b',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
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
            <IconButton color="inherit" onClick={logout} title="Cerrar Sesion">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0f172a',
            color: '#cbd5e1',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
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
                      '& .MuiListItemIcon-root': { color: '#38bdf8' },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#64748b' }}>{item.icon}</ListItemIcon>
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
        ref={mainContentRef}
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 2 },
          py: 3,
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
