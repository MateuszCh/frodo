const SettingsController = require('../controllers/settings.controller');

module.exports = (app) => {
    app.get('/api/settings', SettingsController.get);

    app.put('/api/settings', SettingsController.edit);
};
