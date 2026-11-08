const PostTypeController = require('../controllers/postType.controller');

module.exports = (app) => {
    app.post('/api/postType', PostTypeController.create);

    app.put('/api/postType/edit', PostTypeController.edit);

    app.get('/api/postType', PostTypeController.getAll);

    app.get('/api/postType/:id', PostTypeController.getById);

    app.get('/api/postTypeByType/:type', PostTypeController.getByType);

    app.get('/api/postTypeByTypePostTitles/:type', PostTypeController.getByTypeWithPostTitles);

    app.delete('/api/postType/:id', PostTypeController.delete);

    app.post('/api/exportPostTypes', PostTypeController.exportPostTypes);

    app.post('/api/importPostTypes', PostTypeController.importPostTypes);
};
