const mysql = require('mysql2/promise');

// Crea el pool en forma diferida para permitir iniciar la app y probar rutas sin conexión SQL.
let pool;
function getPool() {
    if (!pool) {
        const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_NAME'];
        const missingVariables = requiredVariables.filter(name => !process.env[name]);
        if (missingVariables.length > 0) {
            throw new Error(`Faltan variables de entorno de base de datos: ${missingVariables.join(', ')}`);
        }

        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    return pool;
}

module.exports = { getPool };