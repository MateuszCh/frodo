const PageController = require('../controllers/page.controller');

module.exports = app => {
    app.post('/api/page', PageController.create);

    app.put('/api/page/edit', PageController.edit);

    app.get('/api/page', PageController.getAll);

    app.get('/api/page/:id', PageController.getById);

    app.delete('/api/page/:id', PageController.delete);

    app.get('/api/exportPages', PageController.exportPages);

    app.post('/api/importPages', PageController.importPages);
};