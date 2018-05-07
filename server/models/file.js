const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const FileSchema = new Schema({
   title: {
       type: String
   },
   filename: {
       type: String,
       required: [true, 'Filename is required']
   },
   src: {
       type: String
   },
   description: {
       type: String
   },
   author: {
       type: String
   },
   place: {
       type: String
   },
   type: {
       type: String
   },
   size: {
       type: Number
   },
   catalogues: {
       type: [String]
   },
   id: {
       type: Number
   },
   created: {
       type: Date
   }
});

const File = mongoose.model('file', FileSchema);

module.exports = File;