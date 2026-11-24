// Carga la configuración local antes de importar módulos que consultan el entorno.
require('dotenv').config();
const { createApp } = require('./app');

// Inicia el servidor HTTP; las consultas SQL se conectan solo al atender operaciones de datos.
const port = Number(process.env.PORT || 3000);
const app = createApp();
app.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}.`);
});
