const AppError = require('../errors/app-error');
const repository = require('../repositories/application.repository');

const VALID_STATUSES = ['RECEIVED', 'IN_REVIEW', 'REJECTED', 'HIRED'];

// Calcula la puntuación y prioridad usando las reglas funcionales existentes del proyecto.
function calculateScoreAndPriority(candidate, vacancy, activeApplicationsCount, source, coverLetter) {
    let score = 0;

    // La experiencia suficiente aporta cuatro puntos.
    if (candidate.experienceYears >= vacancy.minimumExperience) {
        score += 4;
    }

    // Las referencias y postulaciones internas reciben puntos adicionales.
    if (source === 'REFERRAL') {
        score += 3;
    } else if (source === 'INTERNAL') {
        score += 2;
    }

    // Las palabras técnicas indicadas suman puntos si aparece al menos una.
    const normalizedCoverLetter = coverLetter.toLowerCase();
    if (['node', 'sql', 'api'].some(keyword => normalizedCoverLetter.includes(keyword))) {
        score += 2;
    }

    // Una carta extensa suma un punto; el umbral es estrictamente mayor a 500 caracteres.
    if (coverLetter.length > 500) {
        score += 1;
    }

    // Tres o más postulaciones activas en otras vacantes restan dos puntos.
    if (activeApplicationsCount >= 3) {
        score -= 2;
    }
    score = Math.max(score, 0);

    // La prioridad se deriva del puntaje final, ya limitada a cero como mínimo.
    let priority = 'LOW';
    if (score >= 7) {
        priority = 'TOP';
    } else if (score >= 5) {
        priority = 'HIGH';
    } else if (score >= 3) {
        priority = 'MEDIUM';
    }

    return { score, priority };
}

// Permite sustituir el repositorio en pruebas sin alterar el comportamiento de producción.
function createApplicationService(dataRepository = repository) {
    return {
        // Verifica existencia y disponibilidad, calcula el puntaje y traduce duplicados a HTTP 409.
        async createApplication({ candidateId, vacancyId, source, coverLetter }) {
            const candidate = await dataRepository.findCandidateById(candidateId);
            if (!candidate) {
                throw new AppError(404, 'No se encontró el candidato indicado.');
            }

            const vacancy = await dataRepository.findVacancyById(vacancyId);
            if (!vacancy) {
                throw new AppError(404, 'No se encontró la vacante indicada.');
            }
            if (vacancy.status !== 'OPEN') {
                throw new AppError(409, 'La vacante no está abierta para recibir postulaciones.');
            }

            const activeApplicationsCount = await dataRepository.countActiveApplications(candidateId, vacancyId);
            const result = calculateScoreAndPriority(
                candidate,
                vacancy,
                activeApplicationsCount,
                source,
                coverLetter
            );

            try {
                return await dataRepository.createApplication({
                    candidateId,
                    vacancyId,
                    source,
                    coverLetter,
                    ...result
                });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    throw new AppError(409, 'El candidato ya tiene una postulación para esta vacante.');
                }
                throw error;
            }
        },

        // Lista postulaciones con filtros ya validados por el middleware de rutas.
        async listApplications(filters) {
            return dataRepository.findApplications(filters);
        },

        // Rechaza estados no admitidos y comunica con 404 cuando el registro no existe.
        async changeApplicationStatus(applicationId, status) {
            if (!VALID_STATUSES.includes(status)) {
                throw new AppError(400, 'El estado de postulación no es válido.');
            }

            const application = await dataRepository.updateApplicationStatus(applicationId, status);
            if (!application) {
                throw new AppError(404, 'No se encontró la postulación indicada.');
            }
            return application;
        }
    };
}

// Instancia usada por la aplicación; conserva las funciones exportadas que consume la capa HTTP.
const applicationService = createApplicationService();
module.exports = {
    calculateScoreAndPriority,
    createApplicationService,
    ...applicationService
};
