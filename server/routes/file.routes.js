const FileController = require('../controllers/file.controller');

module.exports = app => {

    app.post('/api/file', FileController.upload.array('files'), FileController.create);

    app.put('/api/file/', FileController.edit);

    app.get('/api/file', FileController.getAll);

    app.get('/api/file/catalogues', FileController.getCatalogues);

    app.get('/api/file/:catalogue', FileController.getByCatalogue);

    app.get('/api/file/images', FileController.getAllImages);

    app.get('/api/file/pdfs', FileController.getAllPdfs);

    app.delete('/api/file/:id', FileController.delete);

    app.delete('/api/file/exportfile/:filename', FileController.deleteExportFile);

    app.get('/api/exportFiles', FileController.exportFiles);

    app.post('/api/importFiles', FileController.importFiles);

};