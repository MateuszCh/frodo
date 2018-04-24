const PostTypeController = require('../controllers/postType.controller');

module.exports = app => {
    app.post('/api/postType', PostTypeController.create);

    app.put('/api/postType/edit', PostTypeController.edit);

    app.get('/api/postType', PostTypeController.getAll);

    app.get('/api/postType/:id', PostTypeController.getById);

    app.get('/api/postTypePosts/:id', PostTypeController.getByIdWithPosts);

    app.get('/api/postTypeByType/:type', PostTypeController.getByType);

    app.get('/api/postTypeByTypePosts/:type', PostTypeController.getByTypeWithPosts);

    app.delete('/api/postType/:id', PostTypeController.delete);

    app.get('/api/exportPostTypes', PostTypeController.exportPostTypes);

    app.post('/api/importPostTypes', PostTypeController.importPostTypes);
};