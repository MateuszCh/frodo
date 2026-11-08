const ListingController = require('../controllers/listing.controller');

module.exports = (app) => {
    app.get('/api/listing/:family', ListingController.getPage);
    app.get('/api/listing/:family/all', ListingController.getAll);
};
