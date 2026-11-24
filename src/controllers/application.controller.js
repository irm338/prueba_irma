const applicationService = require('../services/application.service');

// Construye controladores con un servicio inyectable para facilitar pruebas aisladas de HTTP.
function createApplicationController(service = applicationService) {
    return {
        // Delega el registro y devuelve la postulación creada con HTTP 201.
        async create(req, res, next) {
            try {
                const application = await service.createApplication(req.body);
                return res.status(201).json({ message: 'Postulación registrada exitosamente.', data: application });
            } catch (error) {
                return next(error);
            }
        },

        // Devuelve la lista filtrada o transfiere errores al manejador central.
        async list(req, res, next) {
            try {
                const applications = await service.listApplications({
                    status: req.query.status,
                    vacancyId: req.query.vacancyId ? Number(req.query.vacancyId) : undefined
                });
                return res.status(200).json({ data: applications });
            } catch (error) {
                return next(error);
            }
        },

        // Actualiza el estado y devuelve el registro actualizado con HTTP 200.
        async updateStatus(req, res, next) {
            try {
                const application = await service.changeApplicationStatus(
                    Number(req.params.id),
                    req.body.status
                );
                return res.status(200).json({ message: 'Estado de postulación actualizado.', data: application });
            } catch (error) {
                return next(error);
            }
        }
    };
}

module.exports = { createApplicationController };
