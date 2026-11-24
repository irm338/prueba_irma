const { getPool } = require('../config/db');

// Campos compartidos para entregar una representación consistente en creación, listado y consulta.
const APPLICATION_SELECT = `
    SELECT
        p.id AS id,
        p.candidato_id AS candidateId,
        c.nombre AS candidateName,
        c.correo AS candidateEmail,
        p.vacante_id AS vacancyId,
        v.titulo AS vacancyTitle,
        p.carta_presentacion AS coverLetter,
        p.fuente AS source,
        p.puntaje AS score,
        p.prioridad AS priority,
        p.estado AS status,
        p.fecha_creacion AS createdAt,
        p.fecha_actualizacion AS updatedAt
    FROM postulaciones p
    INNER JOIN candidatos c ON c.id = p.candidato_id
    INNER JOIN vacantes v ON v.id = p.vacante_id
`;

// Busca un candidato para validar que existe antes de registrar su postulación.
async function findCandidateById(candidateId) {
    const [rows] = await getPool().execute(
        'SELECT id, nombre AS name, correo AS email, experiencia_anios AS experienceYears FROM candidatos WHERE id = ?',
        [candidateId]
    );
    return rows[0] || null;
}

// Busca la vacante y su estado actual antes de aceptar una postulación.
async function findVacancyById(vacancyId) {
    const [rows] = await getPool().execute(
        'SELECT id, titulo AS title, experiencia_minima AS minimumExperience, estado AS status FROM vacantes WHERE id = ?',
        [vacancyId]
    );
    return rows[0] || null;
}

// Cuenta postulaciones activas del candidato en otras vacantes para aplicar la penalización.
async function countActiveApplications(candidateId, excludedVacancyId) {
    const [rows] = await getPool().execute(
        `SELECT COUNT(*) AS total
         FROM postulaciones
         WHERE candidato_id = ? AND vacante_id <> ? AND estado IN ('RECEIVED', 'IN_REVIEW')`,
        [candidateId, excludedVacancyId]
    );
    return Number(rows[0].total);
}

// Inserta el resultado calculado por el servicio y devuelve el registro completo.
async function createApplication(application) {
    const [result] = await getPool().execute(
        `INSERT INTO postulaciones
            (candidato_id, vacante_id, carta_presentacion, fuente, puntaje, prioridad, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED')`,
        [
            application.candidateId,
            application.vacancyId,
            application.coverLetter,
            application.source,
            application.score,
            application.priority
        ]
    );
    return findApplicationById(result.insertId);
}

// Aplica filtros opcionales usando parámetros enlazados para evitar inyección SQL.
async function findApplications(filters = {}) {
    let query = `${APPLICATION_SELECT} WHERE 1 = 1`;
    const parameters = [];

    if (filters.status) {
        query += ' AND p.estado = ?';
        parameters.push(filters.status);
    }
    if (filters.vacancyId) {
        query += ' AND p.vacante_id = ?';
        parameters.push(filters.vacancyId);
    }

    query += ' ORDER BY p.puntaje DESC, p.fecha_creacion ASC';
    const [rows] = await getPool().execute(query, parameters);
    return rows;
}

// Recupera una postulación después de crearla o actualizar su estado.
async function findApplicationById(applicationId) {
    const [rows] = await getPool().execute(
        `${APPLICATION_SELECT} WHERE p.id = ?`,
        [applicationId]
    );
    return rows[0] || null;
}

// Actualiza el estado; el servicio consulta después para distinguir un id inexistente.
async function updateApplicationStatus(applicationId, status) {
    await getPool().execute(
        'UPDATE postulaciones SET estado = ? WHERE id = ?',
        [status, applicationId]
    );
    return findApplicationById(applicationId);
}

module.exports = {
    findCandidateById,
    findVacancyById,
    countActiveApplications,
    createApplication,
    findApplications,
    updateApplicationStatus
};
