// Valores admitidos por las restricciones de la base de datos.
const APPLICATION_STATUSES = ['RECEIVED', 'IN_REVIEW', 'REJECTED', 'HIRED'];
const APPLICATION_SOURCES = ['REFERRAL', 'INTERNAL', 'JOB_BOARD', 'OTHER'];

// Convierte identificadores de ruta/query a enteros positivos antes de llegar al servicio.
function parsePositiveInteger(value) {
    const parsedValue = Number(value);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

// Valida la forma y los valores de la petición de creación.
function validateCreateApplication(req, res, next) {
    const { candidateId, vacancyId, source, coverLetter } = req.body || {};
    const parsedCandidateId = parsePositiveInteger(candidateId);
    const parsedVacancyId = parsePositiveInteger(vacancyId);

    if (!parsedCandidateId || !parsedVacancyId || typeof source !== 'string'
        || !APPLICATION_SOURCES.includes(source)
        || typeof coverLetter !== 'string' || coverLetter.trim().length === 0) {
        return res.status(400).json({
            error: 'candidateId y vacancyId deben ser enteros positivos; source y coverLetter deben ser válidos.'
        });
    }

    req.body.candidateId = parsedCandidateId;
    req.body.vacancyId = parsedVacancyId;
    req.body.coverLetter = coverLetter.trim();
    return next();
}

// Acepta únicamente filtros válidos; los filtros omitidos no alteran el listado.
function validateListApplications(req, res, next) {
    if (req.query.status && !APPLICATION_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'El estado de postulación no es válido.' });
    }

    if (req.query.vacancyId) {
        const vacancyId = parsePositiveInteger(req.query.vacancyId);
        if (!vacancyId) {
            return res.status(400).json({ error: 'vacancyId debe ser un entero positivo.' });
        }
        req.query.vacancyId = String(vacancyId);
    }

    return next();
}

// Valida el identificador de ruta y el estado que se desea asignar.
function validateUpdateStatus(req, res, next) {
    const applicationId = parsePositiveInteger(req.params.id);
    const { status } = req.body || {};

    if (!applicationId) {
        return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
    }
    if (typeof status !== 'string' || !APPLICATION_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'El estado de postulación no es válido.' });
    }

    req.params.id = String(applicationId);
    return next();
}

module.exports = {
    validateCreateApplication,
    validateListApplications,
    validateUpdateStatus
};
