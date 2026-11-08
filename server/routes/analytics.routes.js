const AnalyticsController = require('../controllers/analytics.controller');

module.exports = (app) => {
    // visit statistics of the public site, from the `visits` collection geosilesia writes
    app.get('/api/analytics/visits', AnalyticsController.visits);
};
