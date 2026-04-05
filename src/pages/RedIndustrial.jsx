import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Storage as ServerIcon,
  Router as RouterIcon,
  SettingsInputComponent as PLCIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import api from '../services/api';

// --- NODOS PERSONALIZADOS ---
const CustomNode = ({ data }) => {
  const isPLC = data.type === 'PLC';
  const isServer = data.type === 'SERVER';
  const isSwitch = data.type === 'SWITCH' || data.type === 'ROUTER';

  const getStatusColor = () => {
    switch (data.status) {
      case 'UP': return '#10b981'; // Verde
      case 'DEGRADED': return '#f59e0b'; // Naranja
      case 'DOWN': return '#ef4444'; // Rojo
      default: return '#94a3b8'; // Gris
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        minWidth: 150,
        borderRadius: 2,
        border: `3px solid ${getStatusColor()}`,
        backgroundColor: '#fff',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {isServer && <ServerIcon color="primary" fontSize="large" />}
        {isSwitch && <RouterIcon color="secondary" fontSize="large" />}
        {isPLC && <PLCIcon sx={{ color: '#6366f1' }} fontSize="large" />}
        
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
          {data.label}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {data.ip}
        </Typography>
        
        {data.latency && (
          <Chip 
            label={`${data.latency}ms`} 
            size="small" 
            variant="outlined" 
            sx={{ mt: 0.5, fontSize: '0.65rem', height: 18 }} 
          />
        )}
      </Box>

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </Paper>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// --- COMPONENTE PRINCIPAL ---
const RedIndustrial = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'SWITCH',
    ip_address: '',
    descripcion: '',
  });

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const fetchNetworkData = async () => {
    try {
      const [plcRes, infraResponse] = await Promise.all([
        api.get('/plcs'),
        api.get('/infrastructure')
      ]);

      const allNodes = [];
      const allEdges = [];

      // Nodo Servidor (Encontrarlo o crearlo virtualmente si no existe)
      const serverNode = infraResponse.data.find(n => n.tipo === 'SERVER') || { id: 0, nombre: 'Server', ip_address: '127.0.0.1' };
      
      const serverId = `infra-${serverNode.id}`;
      allNodes.push({
        id: serverId,
        type: 'custom',
        position: { x: 450, y: 50 },
        data: { label: serverNode.nombre, ip: serverNode.ip_address, type: 'SERVER', status: 'UNKNOWN' },
      });

      // Procesar Infraestructura (Switches/Routers)
      infraResponse.data.filter(n => n.tipo !== 'SERVER').forEach((node, index) => {
        const id = `infra-${node.id}`;
        allNodes.push({
          id,
          type: 'custom',
          position: { x: 200 + (index * 250), y: 250 },
          data: { label: node.nombre, ip: node.ip_address, type: node.tipo, status: 'UNKNOWN', db_id: node.id },
        });
        // Conectar al servidor
        allEdges.push({ id: `e-${serverId}-${id}`, source: serverId, target: id, animated: true });
      });

      // Procesar PLCs
      plcRes.data.forEach((plc, index) => {
        const id = `plc-${plc.id}`;
        allNodes.push({
          id,
          type: 'custom',
          position: { x: 100 + (index * 200), y: 450 },
          data: { label: plc.nombre, ip: plc.ip_address, type: 'PLC', status: 'UNKNOWN', db_id: plc.id },
        });
        
        // Lógica de conexión simple: conectar al primer switch si existe, sino al servidor
        const firstSwitch = allNodes.find(n => n.data.type === 'SWITCH');
        const targetId = firstSwitch ? firstSwitch.id : serverId;
        
        allEdges.push({ id: `e-${targetId}-${id}`, source: targetId, target: id });
      });

      setNodes(allNodes);
      setEdges(allEdges);
    } catch (err) {
      console.error('Error al cargar topología:', err);
    }
  };

  useEffect(() => {
    fetchNetworkData();

    const socket = io('http://localhost:3000');
    socket.on('network_status_update', (statusData) => {
      setNodes((nds) =>
        nds.map((node) => {
          const update = statusData.find((s) => s.id === node.id);
          if (update) {
            return {
              ...node,
              data: {
                ...node.data,
                status: update.status,
                latency: update.latency,
              },
            };
          }
          return node;
        })
      );
    });

    return () => socket.disconnect();
  }, []);

  const handleOpenAdd = () => {
    setEditingNode(null);
    setFormData({ nombre: '', tipo: 'SWITCH', ip_address: '', descripcion: '' });
    setOpenDialog(true);
  };

  const handleNodeClick = (event, node) => {
    if (node.id.startsWith('infra-') && node.data.type !== 'SERVER') {
      setEditingNode(node);
      setFormData({
        nombre: node.data.label,
        tipo: node.data.type,
        ip_address: node.data.ip,
        descripcion: '',
      });
      setOpenDialog(true);
    }
  };

  const handleSave = async () => {
    try {
      if (editingNode) {
        await api.put(`/infrastructure/${editingNode.data.db_id}`, formData);
      } else {
        await api.post('/infrastructure', formData);
      }
      setOpenDialog(false);
      fetchNetworkData();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!editingNode) return;
    if (window.confirm('¿Eliminar este equipo de infraestructura?')) {
      try {
        await api.delete(`/infrastructure/${editingNode.data.db_id}`);
        setOpenDialog(false);
        fetchNetworkData();
      } catch (err) {
        alert('Error al eliminar');
      }
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Topología de Red Industrial</Typography>
          <Typography variant="body2" color="textSecondary">Monitoreo de infraestructura y activos en tiempo real</Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchNetworkData} sx={{ mr: 1 }}>
            Recargar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
            Añadir Equipo Red
          </Button>
        </Box>
      </Box>

      <Paper sx={{ flexGrow: 1, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingNode ? 'Editar Equipo de Red' : 'Añadir Nuevo Equipo'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
          <TextField
            label="Nombre del Equipo"
            fullWidth
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
          <TextField
            select
            label="Tipo de Dispositivo"
            fullWidth
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            <MenuItem value="SWITCH">Switch</MenuItem>
            <MenuItem value="ROUTER">Router</MenuItem>
            <MenuItem value="GATEWAY">Gateway</MenuItem>
            <MenuItem value="ACCESS_POINT">Access Point</MenuItem>
          </TextField>
          <TextField
            label="Dirección IP"
            fullWidth
            placeholder="Ej: 192.168.1.50"
            value={formData.ip_address}
            onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
          />
          <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={2}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          {editingNode ? (
            <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
              Eliminar
            </Button>
          ) : <Box />}
          <Box>
            <Button onClick={() => setOpenDialog(false)} sx={{ mr: 1 }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave}>Guardar</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RedIndustrial;
