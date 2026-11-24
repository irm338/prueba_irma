const express = require('express');
const { createApplicationRouter } = require('./routes/application.routes');

// Crea la aplicación Express y permite inyectar un servicio alternativo en las pruebas.
function createApp(applicationService) {
    const app = express();
    app.use(express.json());

    // El endpoint de salud confirma que el proceso HTTP está activo sin consultar SQL.
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
    app.use('/applications', createApplicationRouter(applicationService));

    // Responde de forma consistente a rutas no declaradas.
    app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

    // Evita exponer detalles de infraestructura y traduce los errores conocidos a HTTP.
    app.use((error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }

        if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
            return res.status(400).json({ error: 'El cuerpo de la petición no contiene JSON válido.' });
        }

        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        if (statusCode === 500) {
            console.error('Error interno al procesar la petición:', error);
        }
        return res.status(statusCode).json({
            error: statusCode === 500 ? 'Error interno del servidor.' : error.message
        });
    });

    return app;
}

module.exports = { createApp };
