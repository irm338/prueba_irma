const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');

// Levanta un servidor local temporal para probar el contrato HTTP sin necesitar MySQL.
async function withServer(service, run) {
    const server = createApp(service).listen(0);
    await once(server, 'listening');
    const address = server.address();

    try {
        await run(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()));
        });
    }
}

// El endpoint de salud debe estar disponible incluso cuando no existe base de datos configurada.
test('health endpoint responds without accessing the database', async () => {
    await withServer(undefined, async baseUrl => {
        const response = await fetch(`${baseUrl}/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: 'ok' });
    });
});

// Rechaza datos de entrada antes de invocar el servicio y acepta una creación válida.
test('validates creation payload and returns the created application', async () => {
    let receivedApplication;
    const service = {
        async createApplication(application) {
            receivedApplication = application;
            return { id: 8, ...application, status: 'RECEIVED' };
        },
        async listApplications() {
            return [];
        },
        async changeApplicationStatus() {
            return { id: 8, status: 'IN_REVIEW' };
        }
    };

    await withServer(service, async baseUrl => {
        const invalidResponse = await fetch(`${baseUrl}/applications`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ candidateId: 0 })
        });
        assert.equal(invalidResponse.status, 400);
        assert.equal(receivedApplication, undefined);

        const response = await fetch(`${baseUrl}/applications`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                candidateId: '2',
                vacancyId: 3,
                source: 'REFERRAL',
                coverLetter: ' Node developer '
            })
        });

        assert.equal(response.status, 201);
        assert.equal(receivedApplication.candidateId, 2);
        assert.equal(receivedApplication.coverLetter, 'Node developer');
        assert.equal((await response.json()).data.id, 8);
    });
});

// Verifica filtros validados, actualización de estado y errores de rutas desconocidas.
test('lists with normalized filters and updates a valid application status', async () => {
    let receivedFilters;
    let receivedUpdate;
    const service = {
        async createApplication() {
            return {};
        },
        async listApplications(filters) {
            receivedFilters = filters;
            return [{ id: 8 }];
        },
        async changeApplicationStatus(id, status) {
            receivedUpdate = { id, status };
            return receivedUpdate;
        }
    };

    await withServer(service, async baseUrl => {
        const listResponse = await fetch(`${baseUrl}/applications?status=RECEIVED&vacancyId=03`);
        assert.equal(listResponse.status, 200);
        assert.deepEqual(receivedFilters, { status: 'RECEIVED', vacancyId: 3 });
        assert.deepEqual((await listResponse.json()).data, [{ id: 8 }]);

        const updateResponse = await fetch(`${baseUrl}/applications/8/status`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status: 'IN_REVIEW' })
        });
        assert.equal(updateResponse.status, 200);
        assert.deepEqual(receivedUpdate, { id: 8, status: 'IN_REVIEW' });

        const missingResponse = await fetch(`${baseUrl}/unknown`);
        assert.equal(missingResponse.status, 404);
    });
});
