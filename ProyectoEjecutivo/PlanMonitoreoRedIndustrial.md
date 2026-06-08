# Plan de Implementación: Monitoreo de Red Industrial (Network Probe)

Este plan detalla la integración de un sistema de monitoreo en tiempo real para PLCs y switches de la red LAN, operando desde un entorno Dockerizado y visualizado en el Dashboard de React.

## Estrategia Técnica
- **Backend (Node.js):** Orquestador de probes (ICMP/Ping y Modbus Check).
- **Docker:** Configuración `network_mode: host` para visibilidad de la LAN física.
- **Comunicación:** Streaming de estados vía Socket.io (latencia < 100ms).
- **Frontend (React):** Visualización de topología dinámica con React Flow.

---

## Tickets de Trabajo

### Ticket 1: Infraestructura y Visibilidad de Red (Docker & Backend)
**Objetivo:** Permitir que el contenedor de Node.js acceda a la LAN física y preparar la estructura base.
- **Acciones:**
    - Modificar `docker-compose.yml`: Configurar `network_mode: "host"` para el servicio `backend`.
    - Crear `backend/src/services/networkMonitor.js`: Singleton para orquestar los chequeos.
    - Instalar dependencias: `ping` (ICMP) y verificar conectividad Modbus básica.
- **Entregable:** Contenedor con acceso a la LAN y esqueleto del servicio de monitoreo.

### Ticket 2: Motor de Probes (ICMP & Modbus Health Check)
**Objetivo:** Implementar la lógica de consulta para Switches y PLCs.
- **Acciones:**
    - **Probes de Switch:** Implementar loop de `ping.promise.probe` a IPs de infraestructura.
    - **Probes de PLC:** Implementar "Modbus TCP Connect Check" (puerto 502).
    - **Configuración:** Carga dinámica de IPs desde la base de datos (tabla `plcs` y configuración de red).
- **Entregable:** Servicio que retorna el estado `UP/DOWN` y latencia de cada nodo.

### Ticket 3: Streaming de Estado vía WebSockets (Real-Time)
**Objetivo:** Notificar al frontend instantáneamente ante cambios en la red.
- **Acciones:**
    - Crear un `setInterval` (ej. cada 5s) para ejecutar los probes.
    - Emitir evento `network_status_update` vía Socket.io con el payload de estados.
    - Implementar filtrado de eventos para evitar inundación de mensajes idénticos.
- **Entregable:** Flujo de datos en tiempo real hacia el Dashboard.

### Ticket 4: Persistencia y Trazabilidad (TimescaleDB)
**Objetivo:** Registro histórico de disponibilidad (SLA) y diagnóstico.
- **Acciones:**
    - Crear migración SQL: Tabla `network_health_logs` (node_id, status, latency, timestamp).
    - Registrar automáticamente cada cambio de estado detectado por el monitor.
    - Exponer endpoint `/api/system-health/network-history` para análisis forense de caídas.
- **Entregable:** Histórico de conectividad persistido en base de datos.

### Ticket 5: Dashboard de Topología (React + React Flow)
**Objetivo:** Interfaz visual intuitiva de la infraestructura industrial.
- **Acciones:**
    - Instalar y configurar `react-flow` en el frontend.
    - Crear página `src/pages/RedIndustrial.jsx` con mapa de nodos (Servidor -> Switches -> PLCs).
    - Vincular estados de Sockets: Cambiar colores (Verde/Rojo) y mostrar latencia dinámicamente.
    - Integrar acceso en el `Sidebar` del Layout.
- **Entregable:** Dashboard de topología de red interactivo y funcional.
