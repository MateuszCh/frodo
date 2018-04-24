function formatId(str){
    return str.replace(/\s+/g, "_").toLowerCase();
}

const formatFieldsIds = function format(fields){
    if(!(fields || fields.length)){
        return true;
    }
    fields.forEach((field) => {
        field.id = formatId(field.id);

        if(field.repeaterFields || field.repeaterFields.length){
            format(field.repeaterFields);
        }
    })
};


module.exports = {
    formatId : formatId,
    formatFieldsIds : formatFieldsIds
};