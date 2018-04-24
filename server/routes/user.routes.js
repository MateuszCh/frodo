const UserController = require('./../controllers/user.controller');

module.exports = app => {
    app.post('/user/login', UserController.login);

    app.get('/user/exist', UserController.exist);

    app.get('/user/logout', UserController.logout);

    app.get('/user/isAuthenticated', UserController.isAuthenticated);

    app.get('/user', UserController.getUser);

    app.post('/user/changePassword', UserController.changePassword);
};