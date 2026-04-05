# Plan de Implementacion: Network Probe y Salud del Sistema

Fecha de referencia: 2026-03-31

## Objetivo

Agregar una segunda capa de monitoreo real de red al sistema para complementar el housekeeping ya implementado en backend.

Hoy la pagina `Salud del Sistema` ya consume snapshots desde backend, pero la metrica `latency_ms` representa la antiguedad del ultimo dato o accion observada, no una latencia real de red.

La siguiente fase debe incorporar:

- `ping` a equipos Ethernet
- chequeo opcional de puertos TCP por protocolo
- persistencia de esa informacion en snapshots
- visualizacion en la UI de `Salud del Sistema`

## Estado actual ya implementado

### Backend

Ya existe una fase 1 de housekeeping:

- migracion:
  - [20260331110000_create_system_health_snapshots.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/migrations/20260331110000_create_system_health_snapshots.js)
- servicio:
  - [systemHealthService.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/systemHealthService.js)
- endpoint:
  - [systemHealthController.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/controllers/systemHealthController.js)
  - [systemHealthRoutes.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/routes/systemHealthRoutes.js)
- arranque:
  - [server.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/server.js)
- helper de conexion PLC:
  - [plcManager.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/plcManager.js)

El endpoint disponible es:

- `GET /api/system-health/latest`

La tabla `system_health_snapshots` ya guarda por componente:

- `snapshot_time`
- `component_type`
- `component_id`
- `component_name`
- `zone`
- `parent_plc_id`
- `status`
- `is_available`
- `communication_state`
- `latency_ms`
- `last_response_at`
- `timeout_count`
- `error_count`
- `metadata`

### Frontend

La pagina:

- [SaludSistema.jsx](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/src/pages/SaludSistema.jsx)

ya hace lo siguiente:

- consume `GET /api/system-health/latest`
- muestra `Ultimo snapshot de housekeeping`
- usa snapshots para colorear PLCs y sensores
- usa tiempo real por socket para las tres luces de actuadores de Zona A
- en cada modal ya muestra:
  - `status`
  - `is_available`
  - `communication_state`
  - `latency_ms`
  - `last_response_at`
  - `timeout_count`
  - `metadata`

## Problema a resolver en la proxima fase

La `latency_ms` actual no es latencia real de red.

Actualmente se calcula como:

- PLC: `snapshot_time - last_response_at`
- SENSOR: `snapshot_time - time` de la ultima lectura
- ACTUATOR: `snapshot_time - timestamp` de la ultima accion

Eso sirve como `edad del ultimo dato`, pero no como `latencia de red`.

## Propuesta de arquitectura para la siguiente fase

Implementar un nuevo servicio backend:

- `networkProbeService.js`

Este servicio debe correr en paralelo al `systemHealthService` y debe medir conectividad IP real.

### Metricas nuevas a capturar

Por equipo Ethernet:

- `ping_latency_ms`
- `reachable`
- `packet_loss`
- `last_ping_at`
- `consecutive_failures`
- `port_reachable`
- `port_latency_ms` si se implementa chequeo TCP

### Equipos candidatos

Inicialmente:

- PLCs con `ip_address`
- placas/controladores Ethernet que hoy esten cargados como PLCs

Opcionalmente en una fase posterior:

- switches administrables

Nota importante:

Hoy no existe una tabla dedicada para switches como entidad de backend. En la UI de `SaludSistema` los switches son componentes visuales compuestos, no entidades reales de DB. Para monitorear switches de verdad se necesita:

1. reutilizar la tabla `plcs` para algunos equipos de red
2. o crear una tabla nueva `network_devices`

Para la proxima sesion conviene empezar solo con PLCs y placas que ya tienen `ip_address`.

## Recomendacion de implementacion

### Opcion recomendada

Guardar las nuevas metricas dentro de `metadata` en la tabla `system_health_snapshots`.

Ventajas:

- no requiere migracion nueva inmediata
- bajo impacto
- simple de integrar

Campos sugeridos dentro de `metadata`:

```json
{
  "ping_latency_ms": 12,
  "reachable": true,
  "packet_loss": 0,
  "last_ping_at": "2026-03-31T18:10:00.000Z",
  "consecutive_failures": 0,
  "port_reachable": true,
  "port_latency_ms": 8
}
```

### Opcion mas prolija a futuro

Crear una tabla separada:

- `system_network_probes`

No es necesaria para la siguiente sesion si se busca avanzar rapido.

## Medicion tecnica sugerida

### 1. Ping ICMP

Usar una libreria Node o invocar herramienta del sistema.

Opciones:

- libreria npm tipo `ping`
- o `child_process` con comando del sistema

Recomendacion:

- usar libreria npm si ya esta disponible o si se decide instalar dependencias
- si no, usar `child_process` con un wrapper para Windows/Linux

### 2. Chequeo TCP complementario

Ademas del ping, verificar puerto del protocolo:

- `MODBUS_TCP`: puerto `502` o el configurado
- `S7`: puerto `102` o el configurado

Esto evita falsos positivos donde la IP responde pero el servicio industrial no.

Implementacion sugerida:

- intentar abrir socket TCP con timeout corto
- medir tiempo hasta `connect`
- registrar si el puerto responde

## Dise�o recomendado del servicio

Archivo nuevo sugerido:

- `backend/src/services/networkProbeService.js`

Responsabilidades:

- iterar los PLCs activos con `ip_address`
- ejecutar ping
- ejecutar test TCP opcional
- guardar resultados en memoria
- exponer un getter para que `systemHealthService` los consuma

Estructura sugerida en memoria:

```js
Map<plcId, {
  reachable: boolean,
  pingLatencyMs: number | null,
  packetLoss: number | null,
  lastPingAt: Date | null,
  consecutiveFailures: number,
  portReachable: boolean | null,
  portLatencyMs: number | null,
  lastError: string | null
}>
```

## Integracion con `systemHealthService`

Modificar:

- [systemHealthService.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/systemHealthService.js)

Para que:

- consulte `networkProbeService.getProbe(plc.id)`
- mezcle esa informacion dentro de `metadata`
- ajuste `communication_state` y `status` cuando:
  - `reachable = false`
  - `port_reachable = false`
  - o existan fallos consecutivos

### Regla sugerida de severidad

- `red`
  - PLC inactivo
  - ping fallando
  - puerto industrial no accesible
- `yellow`
  - ping ok pero sin datos frescos
  - ping ok y puerto ok, pero lecturas stale
- `green`
  - ping ok
  - puerto ok
  - datos frescos o accion reciente

## Cambios sugeridos en frontend

Archivo:

- [SaludSistema.jsx](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/src/pages/SaludSistema.jsx)

Mejoras a realizar en la proxima sesion:

- mostrar en el modal, dentro de `metadata`, algunos campos destacados fuera del JSON:
  - `ping_latency_ms`
  - `reachable`
  - `packet_loss`
  - `port_reachable`
  - `port_latency_ms`
- dejar el JSON crudo de `metadata` como bloque secundario
- opcional: colorear el estado de switches visuales segun el peor estado de los PLCs conectados

## Secuencia recomendada de trabajo para la proxima sesion

1. Crear `networkProbeService.js`
2. Integrarlo en [server.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/server.js)
3. Exponer getter de resultados de probe
4. Integrarlo en [systemHealthService.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/systemHealthService.js)
5. Guardar datos de probe dentro de `metadata`
6. Ajustar reglas de `status` / `communication_state`
7. Mejorar visualizacion en [SaludSistema.jsx](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/src/pages/SaludSistema.jsx)
8. Probar con:
   - PLC accesible
   - PLC inaccesible
   - PLC que responde a ping pero no a puerto

## Consideraciones operativas

- algunos equipos pueden bloquear ICMP
- un ping exitoso no garantiza Modbus/S7 operativo
- algunos entornos Docker pueden cambiar la forma de alcanzar IPs del host
- si se usa comando del sistema para ping:
  - Windows y Linux usan flags distintos
  - hay que encapsularlo

## Consideraciones de nombres y semantica

Hoy el campo `latency_ms` de snapshot significa en realidad:

- antiguedad del ultimo dato o accion observada

En la proxima sesion hay dos caminos:

### Camino A: mantener compatibilidad

Dejar `latency_ms` como esta y agregar en `metadata`:

- `ping_latency_ms`
- `port_latency_ms`
- `response_age_ms`

Esta es la opcion recomendada.

### Camino B: refactor semantico

Renombrar `latency_ms` a `response_age_ms`

No recomendado ahora porque obliga a tocar backend, frontend y datos ya guardados.

## Archivos mas sensibles a revisar primero

- [backend/src/server.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/server.js)
- [backend/src/services/systemHealthService.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/plcManager.js)
- [backend/src/services/systemHealthService.js](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/backend/src/services/systemHealthService.js)
- [src/pages/SaludSistema.jsx](C:/Users/andre/Documents/Proyectos/GeminiTests/AppLGVektorData/src/pages/SaludSistema.jsx)

## Observaciones funcionales ya definidas en la UI

### Zona A

- placa superior = `PVektor02`
- placa inferior = `PVektor01`
- `PVektor02` concentra los tres thermopac
- `PVektor01` controla las alarmas
- las tres luces rojas dependen explicitamente de:
  - `PVektor01 / ACT01`
  - `PVektor01 / ACT02`
  - `PVektor01 / ACT03`

### Zona B

- hotspot caja gris = `PLC01-S01`
- `Switch B` debe reflejar conexion de `PLC01-S01`
- hotspot `Instrumentacion de Campo Sector B` usa:
  - `CAUD02`
  - `GAS001`
- hotspot `Sensor Caudal/Temperatura` usa el resto de sensores de `ZONA_B`

## Criterio de cierre de la proxima fase

La implementacion se considera suficiente si:

- backend genera probes periodicos
- snapshots incluyen resultados de red en `metadata`
- la UI muestra esos campos en modal
- se puede distinguir visualmente:
  - equipo accesible
  - equipo no accesible
  - equipo con datos stale
  - equipo con puerto industrial no accesible

