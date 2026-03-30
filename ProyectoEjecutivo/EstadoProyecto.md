# 📊 Estado del Proyecto: AppLGVektorData

Este documento detalla el progreso actual del proyecto, cubriendo las etapas completadas hasta la fecha.

## Resumen General

El proyecto ha avanzado significativamente, estableciendo una base sólida para la aplicación PWA de monitoreo industrial. Se han completado las etapas de **Infraestructura, Configuración Industrial y el Motor de Adquisición de Datos**, logrando una aplicación funcional con conexión a base de datos persistente, autenticación segura, gestión de dispositivos industriales y visualización de datos en tiempo real.

---

## Etapa 1: Infraestructura Base y Seguridad (Completada)

**Objetivo:** Establecer el núcleo de la aplicación, la conexión a la base de datos y el control de acceso.

*   **Backend:**
    *   Configuración del servidor Express.
    *   Conexión a TimescaleDB con Knex.js.
    *   Soporte para entorno local/remoto vía `.env`.
    *   Persistencia de datos en Docker con volúmenes nombrados (`tsdata`).
    *   Módulo de Autenticación JWT (`/signup`, `/login`, hashing de contraseñas con `bcryptjs`, tokens con roles).
    *   Middlewares `protect` y `authorize` para seguridad de rutas.
*   **Frontend:**
    *   Shell de PWA con layout responsivo (MUI: Sidebar, TopBar).
    *   Configuración de `react-router-dom` con rutas protegidas.
    *   Gestión de estado de autenticación con `AuthContext`.
    *   Vistas de Login y Registro implementadas.
    *   Hot Reload configurado para frontend y backend.

---

## Etapa 2: Gestión Industrial y Configuración (Completada)

**Objetivo:** Permitir la definición del hardware industrial y la "Caja de Ajustes" de los sensores.

*   **Backend:**
    *   **PLCs:** CRUD completo para gestionar dispositivos, con soporte para múltiples protocolos (Modbus, S7, SIMULATED) y auditoría ISO 9000.
    *   **Perfiles de Calibración:** CRUD para definir fórmulas (polinomios y conversiones estándar) y auditoría.
    *   **Sensores:** CRUD completo para configurar señales (PLC, Tag, Dirección, Unidad, Calibración, Rangos, Alertas). Campo `activo` para habilitar/deshabilitar sensores individualmente. Auditoría ISO 9000.
*   **Frontend:**
    *   Paneles de configuración para PLCs, Sensores y Perfiles de Calibración.
    *   UI organizada por pestañas en la configuración de sensores (Identificación, Calibración, Alertas).
    *   Selector de tipo de instrumento (Gauge, Termómetro, etc.) para visualización.
    *   Campo `activo` en la UI de Sensores para control individual.
*   **Sistema de Migraciones:** Knex.js gestiona la creación y actualización de tablas de forma automática y segura.

---

## Etapa 3: Motor de Adquisición de Datos (Completada)

**Objetivo:** Conectar el software con el hardware (o simuladores) y grabar datos en TimescaleDB en tiempo real.

*   **Backend:**
    *   Instalación de librerías industriales (`jsmodbus`, `nodes7`) y WebSockets (`socket.io`).
    *   **PLC Manager:** Clase centralizada para gestionar conexiones de diferentes protocolos (Modbus, S7, SIMULATED).
    *   **Worker de Polling:** Proceso background que lee sensores activos, aplica calibración y guarda datos en `sensor_readings` (TimescaleDB).
    *   **Servidor Socket.io:** Emite actualizaciones de sensores en tiempo real (`sensor_update`).
    *   Lógica de reintentos para la conexión a la base de datos.
    *   Sincronización dinámica de conexiones PLC con cambios en la base de datos.
*   **Frontend:**
    *   Cliente `socket.io-client` para recibir datos en tiempo real.
    *   **Dashboard HMI:**
        *   Visualización con `react-gauge-component`.
        *   Actualización instantánea de valores.
        *   Indicadores de estado de conexión (Polling Activo/Offline).
        *   Indicadores visuales de estado de sensor (colores, iconos, texto para Alertas/Avisos).
        *   Refactorización de la UI de sensores en el Dashboard para mostrar estos estados.
*   **Entorno de Desarrollo:** Hot Reload funcional en Frontend y Backend.

---

## Estado Actual
El proyecto cuenta con una infraestructura robusta y funcional para la gestión de configuración, autenticación, adquisición de datos en tiempo real y persistencia.

Estamos listos para iniciar la **Etapa 4: Dashboard HMI y Control**, donde se añadirán funcionalidades avanzadas como gráficos de tendencias y control de actuadores.
