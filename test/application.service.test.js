const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateScoreAndPriority,
    createApplicationService
} = require('../src/services/application.service');

const candidate = { experienceYears: 4 };
const vacancy = { minimumExperience: 2 };

// Confirma el puntaje alto, el corte por longitud y la prioridad derivada.
test('awards experience, referral, keyword, and long-letter points', () => {
    const result = calculateScoreAndPriority(
        candidate,
        vacancy,
        0,
        'REFERRAL',
        `Node ${'x'.repeat(500)}`
    );

    assert.deepEqual(result, { score: 10, priority: 'TOP' });
});

// Comprueba que la penalización activa no puede producir un puntaje negativo.
test('floors the score at zero after penalizing active applications', () => {
    const result = calculateScoreAndPriority(
        { experienceYears: 0 },
        { minimumExperience: 5 },
        3,
        'JOB_BOARD',
        'Carta sin palabras clave'
    );

    assert.deepEqual(result, { score: 0, priority: 'LOW' });
});

// Verifica los cortes de HIGH/MEDIUM y que exactamente 500 caracteres no sumen longitud.
test('uses the documented priority thresholds and strict letter-length boundary', () => {
    const high = calculateScoreAndPriority(candidate, vacancy, 0, 'INTERNAL', 'x'.repeat(500));
    const medium = calculateScoreAndPriority(candidate, vacancy, 0, 'JOB_BOARD', 'x'.repeat(500));

    assert.deepEqual(high, { score: 6, priority: 'HIGH' });
    assert.deepEqual(medium, { score: 4, priority: 'MEDIUM' });
});

// Confirma que las vacantes cerradas se rechazan antes de contar o guardar postulaciones.
test('rejects applications for a closed vacancy with HTTP 409', async () => {
    const repository = {
        async findCandidateById() {
            return candidate;
        },
        async findVacancyById() {
            return { ...vacancy, status: 'CLOSED' };
        },
        async countActiveApplications() {
            assert.fail('No debe contar postulaciones para una vacante cerrada.');
        },
        async createApplication() {
            assert.fail('No debe guardar una postulación para una vacante cerrada.');
        }
    };
    const service = createApplicationService(repository);

    await assert.rejects(
        service.createApplication({
            candidateId: 1,
            vacancyId: 2,
            source: 'REFERRAL',
            coverLetter: 'Carta válida'
        }),
        error => error.statusCode === 409
    );
});

// Traduce la restricción única de SQL a un conflicto entendible por el cliente.
test('translates duplicate candidate-vacancy inserts to HTTP 409', async () => {
    const repository = {
        async findCandidateById() {
            return candidate;
        },
        async findVacancyById() {
            return { ...vacancy, status: 'OPEN' };
        },
        async countActiveApplications() {
            return 0;
        },
        async createApplication() {
            const error = new Error('duplicate key');
            error.code = 'ER_DUP_ENTRY';
            throw error;
        }
    };
    const service = createApplicationService(repository);

    await assert.rejects(
        service.createApplication({
            candidateId: 1,
            vacancyId: 1,
            source: 'JOB_BOARD',
            coverLetter: 'Carta válida'
        }),
        error => error.statusCode === 409
    );
});
