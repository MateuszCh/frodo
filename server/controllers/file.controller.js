const multer = require('multer'),
      File = require('../models/file'),
      path = require('path'),
      config = require('./../../config'),
      Counter = require('../models/counter'),
      fs = require('fs');

const storage = multer.diskStorage({
   destination: `${__dirname}/../../${config.uploadsPath}`,
   filename: function(req, file, cb){
	   cb(null, path.basename(file.originalname, file.originalName));
   }
});

let filenames = [];
let currentlyUploading = [];

function checkFile(file, cb){
    if(filenames.indexOf(file.originalname) > -1){
        cb(`${file.originalname} already exists`);
    } else if(currentlyUploading.indexOf(file.originalname) > -1) {
        cb(`You are trying to upload two files with the same filename: ${file.originalname}`);
    }
    const filetypes = /jpeg|jpg|png|gif|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if(mimetype && extname){
        currentlyUploading.push(file.originalname);
        return cb(null, true);
    } else {
        cb('Error: Wrong file type' + file.originalname);
    }
}

module.exports = {
    upload: multer({
        storage: storage,
        fileFilter: function(req, file, cb){
            checkFile(file, cb);
        },
        limits: {fileSize: 10000000}
    }),
    setFilenames(req, res, next){
        filenames = [];
        currentlyUploading = [];
        File.find({})
            .then(files => {
                files.forEach(file => filenames.push(file.filename));
                next();
            })
            .catch(e => res.status(422).send({error: 'There was error uploading files'}))

    },
    create(req, res, next){
        const files = req.files;
        const filesProps = req.body.filesData || [];
        const fileModels = [];

        Counter.findOne({})
            .then(counter => {

                files.forEach((file, i) => {
                    const model = {
                        filename : file.filename,
                        src: `/uploads/${file.filename}`,
                        created : Date.now(),
                        type : file.mimetype,
                        size: file.size,
                        id: counter.counter + i
                    };

                    const fileProps = filesProps[file.filename];
                    if(fileProps){
                        const properties = ['title', 'description', 'author', 'place', 'catalogues'];

                        properties.forEach(prop => {
                           if(fileProps[prop]){
                               if(prop === 'catalogues'){
                                   if(Array.isArray(fileProps[prop])){
                                       model[prop] = fileProps[prop].map(catalogue => catalogue.toLowerCase());
                                   } else {
                                       model[prop] = [fileProps[prop].toLowerCase()];
                                   }
                               } else {
                                   model[prop] = fileProps[prop];
                               }
                           }
                        });
                    }

                    fileModels.push(model);
                });

                File.create(fileModels)
                    .then((files) => {
                        res.send(files);
                        Counter.update(counter, {$inc: {counter: files.length}})
                            .then(() => console.log("Counter incremented"))
                            .catch(next);
                    })
                    .catch(next);

            })
            .catch(next);

    },
    edit(req, res, next){
        const fileProps = req.body;
        File.findOne({_id : fileProps._id})
            .then(existingFile => {
                if(existingFile){
                    existingFile.title = fileProps.title;
                    existingFile.description = fileProps.description;
                    existingFile.author = fileProps.author;
                    existingFile.place = fileProps.place;
                    existingFile.catalogues = fileProps.catalogues;

                    existingFile.save()
                        .then(file => res.send(file))
                        .catch(next);
                }
            })
            .catch(next)
    },
    getAll(req, res, next){
        File.find({})
            .then(files => res.send(files))
            .catch(next)
    },
    getCatalogues(req, res, next){
        File.find({}).distinct('catalogues')
            .then(catalogues =>  res.send(catalogues))
            .catch(next)
    },
    getByCatalogue(req, res, next){
        File.find({catalogues: req.params.catalogue})
            .then(files => res.send(files))
            .catch(next)
    },
    getAllImages(req, res, next){
        File.find({type: /^image/})
            .then(images => res.send(images))
            .catch(next)
    },
    getAllPdfs(req, res, next){
        File.find({type: 'application/pdf'})
            .then(pdfs => res.send(pdfs))
            .catch(next);
    },
    delete(req, res, next){
        File.findByIdAndRemove(req.params.id)
            .then(file => {
                if(file){
                    fs.unlink(`${__dirname}/../../${config.uploadsPath}/${file.filename}`, (err) => {
                        if(err) next();
                        res.status(200).send('File removed successfully');
                    });
                } else {
                    res.status(422).send('There is no file to remove');
                }

            })
            .catch(next);
    },
    deleteExportFile(req, res, next){
        const filename = req.params.filename;
        fs.unlink(`${__dirname}/../../${filename}.json`, err =>{
            if(err) next();
            res.send('export file removed');
        })
    },
    importFiles(req, res, next){
        const correctFiles = req.body.files.filter(file => {
            const filenameConflict = filenames.indexOf(file.filename) > -1 || currentlyUploading.indexOf(file.filename) > -1;
            currentlyUploading.push(file.filename);
            return file.filename && !filenameConflict;
        });

        if(correctFiles.length){
            Counter.findOne({})
                .then(counter => {
                    const filesModels = [];
                    const properties = ['title', 'description', 'author', 'place', 'type', 'size', 'catalogues', 'created'];
                    correctFiles.forEach((file, i) => {
                        const model = {
                            filename : file.filename,
                            src: file.src
                        };
                        properties.forEach(prop => {
                            if(file[prop]) model[prop] = file[prop];
                        });
                        model.id = counter.counter + i;
                        if(!file.created) file.created = Date.now();
                        filesModels.push(model);
                    });

                    File.create(filesModels)
                        .then(files => {
                            Counter.update(counter, {$inc: {counter: filesModels.length}})
                                .then(() => {
                                    console.log("Counter incremented");
                                    File.find({})
                                        .then(files => res.send(files))
                                        .catch(next);
                                })
                                .catch(next);
                        })
                        .catch(next);
                })
                .catch(next);
        } else {
            res.status(422).send({error: "There is no valid file to import"});
        }
    },
    exportFiles(req, res, next){
        File.find({})
            .then(files => {
                const formattedFiles = JSON.stringify(files.map(file => {
                    const properties = ['title', 'description', 'author', 'place', 'type', 'size', 'catalogues', 'created'];
                    const newFile = {
                        filename : file.filename,
                        src: file.src
                    };

                    properties.forEach(prop => {
                       if(file[prop]) newFile[prop] = file[prop];
                    });

                    return newFile
                }), null, 4);
                fs.writeFile(`${__dirname}/../../files.json`, formattedFiles, err => {
                    if(err) next();
                    res.send("/export/files.json");
                })
            })
            .catch(next);
    }
};