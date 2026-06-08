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
  Link as LinkIcon,
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import api from '../services/api';

const CONNECTION_TYPES = ['WIRED', 'WIRELESS', 'FIBER', 'LOGICAL', 'VLAN'];

// --- NODOS PERSONALIZADOS ---
// ... (CustomNode code remains the same or slightly adjusted if needed)
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
  const [openEdgeDialog, setOpenEdgeDialog] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'SWITCH',
    ip_address: '',
    descripcion: '',
  });

  const [edgeFormData, setEdgeFormData] = useState({
    type: 'WIRED',
    metadata: '',
  });

  const fetchNetworkData = async () => {
    try {
      const [plcRes, infraResponse, connResponse] = await Promise.all([
        api.get('/plcs'),
        api.get('/infrastructure'),
        api.get('/infrastructure/connections')
      ]);

      const allNodes = [];
      
      // Nodo Servidor
      const serverNode = infraResponse.data.find(n => n.tipo === 'SERVER') || { id: 0, nombre: 'Server', ip_address: '127.0.0.1' };
      const serverId = `infra-${serverNode.id}`;
      allNodes.push({
        id: serverId,
        type: 'custom',
        position: { x: 450, y: 50 },
        data: { label: serverNode.nombre, ip: serverNode.ip_address, type: 'SERVER', status: 'UNKNOWN' },
      });

      // Procesar Infraestructura
      infraResponse.data.filter(n => n.tipo !== 'SERVER').forEach((node, index) => {
        const id = `infra-${node.id}`;
        allNodes.push({
          id,
          type: 'custom',
          position: { 
            x: node.pos_x || 200 + (index * 250), 
            y: node.pos_y || 250 
          },
          data: { label: node.nombre, ip: node.ip_address, type: node.tipo, status: 'UNKNOWN', db_id: node.id },
        });
      });

      // Procesar PLCs
      plcRes.data.forEach((plc, index) => {
        const id = `plc-${plc.id}`;
        allNodes.push({
          id,
          type: 'custom',
          position: { 
            x: plc.pos_x || 100 + (index * 200), 
            y: plc.pos_y || 450 
          },
          data: { label: plc.nombre, ip: plc.ip_address, type: 'PLC', status: 'UNKNOWN', db_id: plc.id },
        });
      });

      // Procesar Conexiones (Edges)
      const dbEdges = connResponse.data.map(conn => ({
        id: `e-${conn.id}`,
        source: conn.source_id,
        target: conn.target_id,
        label: conn.type,
        animated: conn.type === 'LOGICAL' || conn.type === 'VLAN',
        data: { db_id: conn.id, type: conn.type, metadata: conn.metadata },
        style: { 
          stroke: conn.type === 'FIBER' ? '#06b6d4' : conn.type === 'WIRELESS' ? '#f59e0b' : '#64748b',
          strokeWidth: 2 
        }
      }));

      setNodes(allNodes);
      setEdges(dbEdges);
    } catch (err) {
      console.error('Error al cargar topología:', err);
    }
  };

  const onConnect = useCallback(
    async (params) => {
      try {
        const { source, target } = params;
        const res = await api.post('/infrastructure/connections', {
          source_id: source,
          target_id: target,
          type: 'WIRED'
        });
        
        const newEdge = {
          id: `e-${res.data.id}`,
          source: res.data.source_id,
          target: res.data.target_id,
          label: res.data.type,
          data: { db_id: res.data.id, type: res.data.type }
        };
        
        setEdges((eds) => addEdge(newEdge, eds));
      } catch (err) {
        alert('Error al crear conexión: ' + (err.response?.data?.message || err.message));
      }
    },
    [setEdges],
  );

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
        descripcion: node.data.descripcion || '',
      });
      setOpenDialog(true);
    }
  };

  const handleEdgeClick = (event, edge) => {
    setEditingEdge(edge);
    setEdgeFormData({
      type: edge.data.type,
      metadata: edge.data.metadata || '',
    });
    setOpenEdgeDialog(true);
  };

  const handleSaveNode = async () => {
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

  const handleDeleteNode = async () => {
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

  const handleSaveEdge = async () => {
    try {
      await api.put(`/infrastructure/connections/${editingEdge.data.db_id}`, edgeFormData);
      setOpenEdgeDialog(false);
      fetchNetworkData();
    } catch (err) {
      alert('Error al actualizar conexión: ' + err.message);
    }
  };

  const handleDeleteEdge = async () => {
    if (!editingEdge) return;
    if (window.confirm('¿Eliminar esta conexión?')) {
      try {
        await api.delete(`/infrastructure/connections/${editingEdge.data.db_id}`);
        setOpenEdgeDialog(false);
        fetchNetworkData();
      } catch (err) {
        alert('Error al eliminar conexión');
      }
    }
  };

  const onNodeDragStop = useCallback(
    async (event, node) => {
      if (node.id.startsWith('infra-') && node.data.db_id) {
        try {
          await api.put(`/infrastructure/${node.data.db_id}`, {
            pos_x: Math.round(node.position.x),
            pos_y: Math.round(node.position.y)
          });
        } catch (err) {
          console.error('Error al guardar posición infra:', err);
          alert('No se pudo guardar la posición del nodo de infraestructura.');
        }
      } else if (node.id.startsWith('plc-') && node.data.db_id) {
        try {
          await api.put(`/plcs/${node.data.db_id}`, {
            pos_x: Math.round(node.position.x),
            pos_y: Math.round(node.position.y)
          });
        } catch (err) {
          console.error('Error al guardar posición PLC:', err);
          alert('No se pudo guardar la posición del PLC.');
        }
      }
    },
    []
  );

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
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </Paper>

      {/* DIALOGO NODO */}
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
            <Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteNode}>
              Eliminar
            </Button>
          ) : <Box />}
          <Box>
            <Button onClick={() => setOpenDialog(false)} sx={{ mr: 1 }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveNode}>Guardar</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* DIALOGO CONEXIÓN */}
      <Dialog open={openEdgeDialog} onClose={() => setOpenEdgeDialog(false)}>
        <DialogTitle>Configurar Conexión de Red</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="textSecondary">
              Desde: <strong>{editingEdge?.source}</strong> → Hasta: <strong>{editingEdge?.target}</strong>
            </Typography>
          </Box>
          
          <TextField
            select
            label="Tipo de Conexión"
            fullWidth
            value={edgeFormData.type}
            onChange={(e) => setEdgeFormData({ ...edgeFormData, type: e.target.value })}
          >
            {CONNECTION_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          
          <TextField
            label="Metadatos / Notas"
            fullWidth
            placeholder="Ej: Puerto GI0/1, SSID: Industrial_WiFi"
            value={edgeFormData.metadata}
            onChange={(e) => setEdgeFormData({ ...edgeFormData, metadata: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteEdge}>
            Eliminar
          </Button>
          <Box>
            <Button onClick={() => setOpenEdgeDialog(false)} sx={{ mr: 1 }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveEdge}>Actualizar</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RedIndustrial;
