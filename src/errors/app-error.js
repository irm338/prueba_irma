// Error de aplicación con un estado HTTP conocido para responder sin filtrar detalles internos.
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
    }
}

module.exports = AppError;
