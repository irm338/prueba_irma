const { Router } = require('express');
const { createApplicationController } = require('../controllers/application.controller');
const {
    validateCreateApplication,
    validateListApplications,
    validateUpdateStatus
} = require('../middleware/validation.middleware');

// Enlaza las operaciones HTTP con sus validaciones y controladores correspondientes.
function createApplicationRouter(service) {
    const router = Router();
    const controller = createApplicationController(service);

    router.post('/', validateCreateApplication, controller.create);
    router.get('/', validateListApplications, controller.list);
    router.put('/:id/status', validateUpdateStatus, controller.updateStatus);

    return router;
}

module.exports = { createApplicationRouter };
