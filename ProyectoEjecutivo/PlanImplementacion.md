# Plan de Implementación: PWA AppLGVektorData

Este documento detalla la estrategia de desarrollo para la aplicación PWA de monitoreo industrial en tiempo real, integrando PLCs, TimescaleDB y React, cumpliendo con los requerimientos técnicos y de trazabilidad ISO 9000.

## Estrategia Arquitectónica
- **Backend:** Node.js con un motor dinámico de protocolos (Pattern Adapter) para comunicación con PLCs.
- **Base de Datos:** TimescaleDB para almacenamiento eficiente de series temporales y auditoría.
- **Frontend:** React PWA con WebSockets para visualización en tiempo real (< 100ms de latencia).
- **Calibración:** Procesamiento de señales mediante polinomios de hasta 4to grado antes de la persistencia.

---

## Etapa 1: Infraestructura Base y Seguridad
**Objetivo:** Establecer el núcleo de la aplicación y el control de acceso.

| Ticket | Tarea | Descripción |
| :--- | :--- | :--- |
| **1.1** | Setup del Servidor y Conexión DB | Configurar Express y el pool de conexión a TimescaleDB. Implementar soporte para servidor local y remoto vía `.env`. |
| **1.2** | Módulo de Autenticación JWT | Implementar endpoints de `/signup` y `/login`. Manejo de roles: ADMIN, LIDER, DEVELOPER, TECHNICIAN. |
| **1.3** | Shell de la PWA y Navegación | Layout responsivo con MUI (Sidebar y TopBar). Configuración de rutas protegidas por rol. |
| **1.4** | Vistas de Acceso Industrial | Formularios de Login/Registro centrados en usabilidad y robustez. |

## Etapa 2: Gestión Industrial y Configuración
**Objetivo:** Definir el hardware y la "Caja de Ajustes" de los sensores.

| Ticket | Tarea | Descripción |
| :--- | :--- | :--- |
| **2.1** | CRUD de PLCs | Interfaz para dar de alta equipos indicando marca (Siemens, Delta, etc.) y protocolo (Modbus, S7, etc.). |
| **2.2** | Perfiles de Calibración | Sistema de carga de coeficientes polinómicos (c0-c4) para linealización de señales analógicas. |
| **2.3** | Configuración de Sensores | Panel de "Caja de Ajustes": definir Tags, direcciones de memoria, rangos y niveles de aviso/alerta. |
| **2.4** | Middleware de Trazabilidad | Implementar el registro automático en `audit_logs` para cambios de configuración (ISO 9000). |

## Etapa 3: Motor de Adquisición de Datos
**Objetivo:** Conexión activa con el hardware y grabación en series temporales.

| Ticket | Tarea | Descripción |
| :--- | :--- | :--- |
| **3.1** | PLC Manager (Adapter) | Lógica dinámica que carga drivers según el protocolo configurado en la base de datos. |
| **3.2** | Worker de Polling | Proceso en background que lee los PLCs, aplica polinomios de ajuste y guarda en la Hypertable. |
| **3.3** | WebSockets de Tiempo Real | Emisión de lecturas procesadas desde el backend hacia el frontend mediante Socket.io. |
| **3.4** | Políticas de Retención DB | Configurar TimescaleDB para gestionar el ciclo de vida de los datos (compresión y purga). |

## Etapa 4: Dashboard HMI y Control
**Objetivo:** Visualización intuitiva y control interactivo.

| Ticket | Tarea | Descripción |
| :--- | :--- | :--- |
| **4.1** | Instrumentación Digital | Implementación de `react-gauge-component` para las 10 variables con alertas visuales dinámicas. |
| **4.2** | Gráficos de Tendencias | Visualización de históricos con Recharts usando `time_bucket` de SQL para optimizar consultas. |
| **4.3** | Control de Actuadores | Interfaz para las 3 acciones: 2 ON/OFF y 1 ajuste analógico con confirmación de seguridad. |
| **4.4** | Motor de Eventos/Alertas | Detección de excedentes de límites y registro de eventos críticos en la base de datos. |

## Etapa 5: Optimización PWA y Entrega
**Objetivo:** Finalización para entorno productivo y cumplimiento normativo.

| Ticket | Tarea | Descripción |
| :--- | :--- | :--- |
| **5.1** | Configuración PWA Offline | Service Workers y Manifiesto para instalación y carga instantánea en planta. |
| **5.2** | Administración de Usuarios | Panel exclusivo para ADMIN para la gestión y asignación de roles. |
| **5.3** | Reportes de Auditoría | Generación de reportes de trazabilidad e históricos exportables para cumplimiento ISO. |
| **5.4** | Despliegue con Docker | Configuración de `docker-compose` para orquestar DB, Backend y Frontend en un servidor local. |
