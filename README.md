# API REST de gestión de postulaciones laborales

API construida con Node.js, Express y MySQL para registrar postulaciones, calcular su puntaje/prioridad, consultar resultados y actualizar estados.

## Arquitectura

La aplicación separa las responsabilidades para mantener las reglas de negocio y el acceso a SQL fuera de las rutas HTTP:

- `src/routes/`: define los endpoints y asocia validadores y controladores.
- `src/middleware/`: valida parámetros, filtros y cuerpos de las solicitudes.
- `src/controllers/`: traduce solicitudes HTTP en llamadas al servicio y prepara respuestas.
- `src/services/`: aplica las reglas de negocio y transforma errores de dominio en respuestas HTTP conocidas.
- `src/repositories/`: ejecuta consultas MySQL parametrizadas.
- `src/config/`: configura de forma diferida el pool de conexiones.
- `src/errors/`: contiene el error de aplicación con código HTTP.
- `src/app.js`: configura Express y sus manejadores centrales.
- `src/index.js`: carga variables de entorno e inicia el servidor.

Estructura relevante del proyecto:

```text
src/
  app.js
  index.js
  config/db.js
  controllers/application.controller.js
  errors/app-error.js
  middleware/validation.middleware.js
  repositories/application.repository.js
  routes/application.routes.js
  services/application.service.js
test/
  application.routes.test.js
  application.service.test.js
database.sql
.env.example
```

## Modelo de datos

`database.sql` crea tres tablas InnoDB:

| Tabla | Propósito | Restricciones principales |
| --- | --- | --- |
| `candidatos` | Datos del candidato y años de experiencia | PK `id`, correo único, experiencia no negativa |
| `vacantes` | Título, experiencia mínima y estado `OPEN`/`CLOSED` | PK `id`, experiencia no negativa |
| `postulaciones` | Relación entre un candidato y una vacante | PK `id`, FK a candidato/vacante, combinación candidato-vacante única, valores permitidos para fuente, prioridad y estado |

Las llaves foráneas eliminan postulaciones asociadas cuando se elimina su candidato o vacante. La base incluye tres candidatos y dos vacantes de ejemplo, una abierta y otra cerrada. La API solo acepta nuevas postulaciones para vacantes `OPEN`.

## Reglas de puntuación

El puntaje se calcula al crear la postulación:

| Regla | Puntos |
| --- | ---: |
| Experiencia del candidato igual o mayor a la mínima de la vacante | +4 |
| Fuente `REFERRAL` | +3 |
| Fuente `INTERNAL` | +2 |
| La carta contiene `node`, `sql` o `api` (sin distinguir mayúsculas) | +2 |
| Carta de más de 500 caracteres | +1 |
| Tres o más postulaciones activas (`RECEIVED` o `IN_REVIEW`) en otras vacantes | -2 |

El puntaje mínimo es cero. Prioridad: `TOP` desde 7 puntos, `HIGH` desde 5, `MEDIUM` desde 3 y `LOW` por debajo de 3. El listado se ordena por puntaje descendente y, en empate, fecha de creación ascendente.

## Requisitos e instalación

- Node.js 18 o posterior.
- MySQL 8 o posterior (se requieren restricciones `CHECK` aplicadas por el motor).

```bash
npm install
```

Copia `.env.example` a `.env` y configura la conexión:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_clave
DB_NAME=gestion_postulaciones
```

Crea la base de datos y carga el esquema y los datos de ejemplo:

```sql
CREATE DATABASE gestion_postulaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
mysql -u root -p gestion_postulaciones < database.sql
```

Inicia el servidor:

```bash
npm start
```

La API queda disponible en `http://localhost:3000`. El endpoint `GET /health` confirma que el servidor está activo sin requerir una conexión SQL.

## Endpoints

Todas las respuestas están en JSON. Los identificadores deben ser enteros positivos.

### `POST /applications`

Registra una postulación. `source` acepta `REFERRAL`, `INTERNAL`, `JOB_BOARD` o `OTHER`.

```http
POST /applications
Content-Type: application/json
```

```json
{
  "candidateId": 1,
  "vacancyId": 1,
  "source": "REFERRAL",
  "coverLetter": "Tengo experiencia desarrollando APIs con Node y SQL."
}
```

Respuesta `201 Created` (los valores calculados dependen del candidato y de sus postulaciones activas):

```json
{
  "message": "Postulación registrada exitosamente.",
  "data": {
    "id": 1,
    "candidateId": 1,
    "candidateName": "Ana Gómez",
    "candidateEmail": "ana.gomez@email.com",
    "vacancyId": 1,
    "vacancyTitle": "Desarrollador Backend Node.js",
    "coverLetter": "Tengo experiencia desarrollando APIs con Node y SQL.",
    "source": "REFERRAL",
    "score": 9,
    "priority": "TOP",
    "status": "RECEIVED",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Respuestas de error: `400` entrada inválida, `404` candidato/vacante inexistente, `409` vacante cerrada o postulación duplicada, `500` error inesperado de servidor.

### `GET /applications`

Lista postulaciones con orden de puntaje descendente y fecha ascendente. Filtros opcionales: `status` (`RECEIVED`, `IN_REVIEW`, `REJECTED`, `HIRED`) y `vacancyId`.

```http
GET /applications?status=RECEIVED&vacancyId=1
```

Respuesta `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "candidateId": 1,
      "candidateName": "Ana Gómez",
      "candidateEmail": "ana.gomez@email.com",
      "vacancyId": 1,
      "vacancyTitle": "Desarrollador Backend Node.js",
      "coverLetter": "Tengo experiencia desarrollando APIs con Node y SQL.",
      "source": "REFERRAL",
      "score": 9,
      "priority": "TOP",
      "status": "RECEIVED",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### `PUT /applications/:id/status`

Actualiza el estado a `RECEIVED`, `IN_REVIEW`, `REJECTED` o `HIRED`.

```http
PUT /applications/1/status
Content-Type: application/json
```

```json
{ "status": "IN_REVIEW" }
```

Respuesta `200 OK`:

```json
{
  "message": "Estado de postulación actualizado.",
  "data": {
    "id": 1,
    "candidateId": 1,
    "candidateName": "Ana Gómez",
    "candidateEmail": "ana.gomez@email.com",
    "vacancyId": 1,
    "vacancyTitle": "Desarrollador Backend Node.js",
    "coverLetter": "Tengo experiencia desarrollando APIs con Node y SQL.",
    "source": "REFERRAL",
    "score": 9,
    "priority": "TOP",
    "status": "IN_REVIEW",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

La respuesta incluye los mismos campos completos que el registro de `POST`. Si la postulación no existe devuelve `404`; un estado inválido devuelve `400`.

### `GET /health`

Verifica el proceso web sin acceder a la base de datos.

```json
{ "status": "ok" }
```

## Pruebas y validación

```bash
npm test
```

Las pruebas unitarias cubren las reglas de puntaje y las respuestas/validaciones HTTP. Para validar operaciones SQL con datos reales, configura `.env`, carga `database.sql` y prueba los endpoints descritos arriba.
