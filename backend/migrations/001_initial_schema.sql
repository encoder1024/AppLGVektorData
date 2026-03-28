-- 1. Habilitar la extensión TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. TIPOS ENUMERADOS (Garantía de integridad de datos)
CREATE TYPE user_role AS ENUM ('ADMIN', 'LIDER', 'DEVELOPER', 'TECHNICIAN');
CREATE TYPE plc_brand AS ENUM ('SIEMENS', 'SCHNEIDER', 'ALLEN_BRADLEY', 'DELTA', 'ARDUINO', 'OTHER');
CREATE TYPE plc_protocol AS ENUM ('MODBUS_TCP', 'S7', 'ETHERNET_IP', 'OPC_UA', 'MQTT');
CREATE TYPE signal_type AS ENUM ('ANALOG_INPUT', 'ANALOG_OUTPUT', 'DIGITAL_INPUT', 'DIGITAL_OUTPUT');
CREATE TYPE data_type AS ENUM ('INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT32', 'BOOLEAN');

-- 3. Gestión de Usuarios y Roles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'TECHNICIAN',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Perfiles de Calibración / Linealización
-- Propuesta: y = c4*x^4 + c3*x^3 + c2*x^2 + c1*x + c0
-- c0: Offset (b), c1: Pendiente (m) en lineales. c2-c4 para curvas no lineales.
CREATE TABLE IF NOT EXISTS calibration_profiles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    c0 DOUBLE PRECISION DEFAULT 0, -- Término constante (Intersección)
    c1 DOUBLE PRECISION DEFAULT 1, -- Coeficiente lineal
    c2 DOUBLE PRECISION DEFAULT 0, -- Coeficiente cuadrático
    c3 DOUBLE PRECISION DEFAULT 0, -- Coeficiente cúbico
    c4 DOUBLE PRECISION DEFAULT 0, -- Coeficiente cuártico
    creado_por INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Configuración de PLCs
CREATE TABLE IF NOT EXISTS plcs (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    marca plc_brand NOT NULL,
    protocolo plc_protocol NOT NULL,
    ip_address INET NOT NULL,
    puerto INTEGER NOT NULL,
    unidad_id INTEGER DEFAULT 1,       -- Slave ID para Modbus
    scan_rate_ms INTEGER DEFAULT 1000,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Definición de Sensores e Instrumentos (Caja de Ajustes)
CREATE TABLE IF NOT EXISTS sensors (
    id SERIAL PRIMARY KEY,
    plc_id INTEGER REFERENCES plcs(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    tipo_signal signal_type NOT NULL,
    tipo_dato_plc data_type NOT NULL,
    direccion_memoria VARCHAR(50),
    unidad_medida VARCHAR(20),
    
    -- Ajuste de Linealidad
    calibration_profile_id INTEGER REFERENCES calibration_profiles(id),
    
    -- Configuración de Visualización y Alertas
    min_range DOUBLE PRECISION DEFAULT 0,
    max_range DOUBLE PRECISION DEFAULT 100,
    warning_low DOUBLE PRECISION,      -- Nivel aviso preventivo inferior
    warning_high DOUBLE PRECISION,     -- Nivel aviso preventivo superior
    alert_low DOUBLE PRECISION,        -- Nivel alerta crítico inferior
    alert_high DOUBLE PRECISION,       -- Nivel alerta crítico superior
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Definición de Actuadores (Acciones)
CREATE TABLE IF NOT EXISTS actuators (
    id SERIAL PRIMARY KEY,
    plc_id INTEGER REFERENCES plcs(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo_signal signal_type NOT NULL, -- DIGITAL_OUTPUT para ON/OFF, ANALOG_OUTPUT para ajuste
    direccion_memoria VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE SERIES TEMPORALES (Lecturas de Sensores)
CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
    valor_procesado DOUBLE PRECISION NOT NULL, -- Valor ya escalado por el backend
    valor_crudo DOUBLE PRECISION              -- Valor original del PLC (opcional p/ auditoría)
);

-- Convertir en Hypertable para optimizar series temporales
SELECT create_hypertable('sensor_readings', 'time');

-- 9. Trazabilidad y Auditoría (Norma ISO 9000)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    accion_tipo VARCHAR(50) NOT NULL,
    target_id INTEGER,
    descripcion TEXT,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    ip_cliente INET
);

-- 10. Configuración Global de la App
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices de rendimiento
CREATE INDEX idx_sensor_readings_id_time ON sensor_readings(sensor_id, time DESC);
CREATE INDEX idx_audit_time ON audit_logs(time DESC);
