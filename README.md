# API del clima serverless

API serverless en AWS que expone el clima actual de una ciudad. Recibe `GET /weather?city={ciudad}` a través de API Gateway, invoca una función Lambda que consulta el geocoding y el forecast de [Open-Meteo](https://open-meteo.com) y devuelve un contrato propio, estable y limpio, sin reenviar la respuesta original del proveedor.

## Requisitos previos

| Herramienta    | Versión                    | Para qué                                                 |
| -------------- | -------------------------- | -------------------------------------------------------- |
| Node.js        | 24 LTS                     | Desarrollo, pruebas y runtime de la Lambda               |
| npm            | incluido con Node.js       | Gestión de dependencias                                  |
| Git            | cualquier versión reciente | Control de versiones                                     |
| Docker Desktop | en ejecución               | `sam local start-api` ejecuta la Lambda en un contenedor |
| AWS SAM CLI    | 1.170 o superior           | Build y ejecución local de la plantilla                  |


## Instalación

```bash
git clone https://github.com/dennysgf/api-serveless.git
cd api-serveless
npm install
```

## Ejecución local

Con Docker en ejecución:

```bash
sam build
sam local start-api
```

La API queda disponible en `http://127.0.0.1:3000`. Deja esa terminal abierta y prueba desde otra:

```bash
curl "http://127.0.0.1:3000/weather?city=Bogota"
```

## Variables de entorno

| Variable        | Valor por defecto                         | Descripción                                                                  |
| --------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `GEOCODING_URL` | `https://geocoding-api.open-meteo.com/v1` | URL base del servicio de geocoding                                           |
| `FORECAST_URL`  | `https://api.open-meteo.com/v1`           | URL base del servicio de forecast                                            |
| `TIMEOUT_MS`    | `5000`                                    | Tiempo máximo de espera por petición a Open-Meteo, entre 1 y 30000 |

En local, los valores se definen como parámetros de la plantilla SAM. Si una variable tiene un valor inválido, la función falla al iniciar con un error de configuración.

## Pruebas y calidad

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run check
```

`npm run check` ejecuta todo lo anterior. Además, `npm run check:comments` verifica que el código fuente no contenga comentarios.

## Ejemplos de uso

### Probar con Postman

1. Crea una petición nueva con el método `GET`.
2. En la URL escribe `http://127.0.0.1:3000/weather`.
3. En la pestaña **Params** agrega la clave `city` con el valor `Bogota`.
4. Pulsa **Send**. Debes recibir un `200` con los datos del clima.
5. Para probar los errores, quita el parámetro `city` (debe responder `400`) o usa `Ciudadinventada` (debe responder `404`).

### Consulta correcta

```bash
curl "http://127.0.0.1:3000/weather?city=Bogota"
```

```json
{
  "city": "Bogotá",
  "country": "Colombia",
  "coordinates": { "latitude": 4.60971, "longitude": -74.08175 },
  "timezone": "America/Bogota",
  "current": {
    "temperature": { "value": 15.9, "unit": "°C" },
    "humidity": { "value": 66, "unit": "%" },
    "windSpeed": { "value": 2.6, "unit": "km/h" },
    "condition": "Nublado",
    "observedAt": "2026-10-27T21:00"
  }
}
```

Los valores de clima cambian con el tiempo; la estructura es la que se garantiza.

### Ciudad no encontrada

```bash
curl "http://127.0.0.1:3000/weather?city=Ciudadinventada"
```

```json
{
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "No se encontró la ciudad 'Ciudadinventada'"
  }
}
```

### Parámetro inválido

```bash
curl "http://127.0.0.1:3000/weather"
```

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "El parámetro city debe ser obligatorio, debe tener entre 2 y 100 caracteres"
  }
}
```

## Códigos de error

| HTTP | Código            | Cuándo ocurre                                                                           |
| ---- | ----------------- | --------------------------------------------------------------------------------------- |
| 400  | `INVALID_REQUEST` | Falta `city`, está vacío, tiene menos de 2 caracteres o más de 100                      |
| 404  | `CITY_NOT_FOUND`  | El geocoding no encuentra la ciudad                                                     |
| 502  | `UPSTREAM_ERROR`  | Open-Meteo responde con error, responde con un formato inesperado o supera el timeout |
| 500  | `INTERNAL_ERROR`  | Cualquier error no controlado. No expone detalles internos                              |

Todas las respuestas de error usan el mismo formato: `{ "error": { "code": "...", "message": "..." } }`.

## Estructura del proyecto

```
src/
  app/            Caso de uso: obtener el clima de una ciudad
  clients/        Cliente HTTP de Open-Meteo, con validación de respuestas
  config/         Lectura y validación de variables de entorno
  domain/         Reglas de negocio: validación de ciudad, códigos del clima, contrato
  errors/         Errores tipados con código HTTP
  http/           Traducción entre eventos de API Gateway y el caso de uso
  logging/        Logger estructurado en JSON
  handler.ts      Punto de entrada: conecta las dependencias
tests/            Pruebas unitarias con Open-Meteo simulado
template.yaml     Plantilla AWS SAM
```

## Decisiones técnicas

- **Arquitectura por capas.** El handler solo traduce el evento HTTP. La lógica vive en `app/` y `domain/`, y el acceso a Open-Meteo en `clients/`. Así cada parte se prueba sin depender de las demás.
- **TypeScript en modo estricto,** sin `any`. Las respuestas externas se validan en tiempo de ejecución con `zod`, de modo que el tipo que usa el dominio coincide con lo que realmente llegó.
- **Errores tipados.** Cada error conocido lleva su código HTTP y su código de negocio. Cualquier otro error se convierte en un 500 genérico, con el detalle solo en los logs.
- **Contrato propio.** No se reenvía la respuesta de Open-Meteo. Las coordenadas salen del geocoding, las unidades y la condición en español se derivan del código WMO.
- **Timeout explícito** de 5 segundos por defecto, configurable. Evita que una petición lenta consuma toda la ejecución de la Lambda.
- **Logs estructurados en JSON** con `requestId`, de modo que cada línea se puede seguir en CloudWatch.
- **HTTP API** en lugar de REST API, por ser más simple y económica para este caso.
- **Control de comentarios en el código** para mantener el código autoexplicativo. La documentación vive en este README.

## Qué mejoraría con más tiempo

- **Caché por ciudad** en DynamoDB con TTL de 10 minutos, para no consultar Open-Meteo en cada petición.
- **Reintentos con backoff** ante errores transitorios de Open-Meteo.
- **Documentación OpenAPI** del contrato, publicada junto a la API.
- **Nivel de log configurable** mediante una variable de entorno.
- **Pipeline de CI** con GitHub Actions que ejecute `npm run check` en cada push.
- **Cobertura de pruebas** medida con `@vitest/coverage-v8` y un umbral mínimo.
- **Pruebas de integración** contra un servidor simulado de Open-Meteo, además de las unitarias.
