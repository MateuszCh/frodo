//property name and value of 'type' property should be the same

(function() {
    angular.module("frodo").constant("fields", {
        text: {
            name: "Text",
            type: "text"
        },
        textarea: {
            name: "Textarea",
            type: "textarea"
        },
        checkbox: {
            name: "True/False",
            type: "checkbox"
        },
        select: {
            name: "Select",
            type: "select"
        },
        multiselect: {
            name: "Multiselect",
            type: "multiselect"
        },
        repeater: {
            name: "Repeater",
            type: "repeater"
        },
        number: {
            name: "Number",
            type: "number"
        },
        file: {
            name: "File",
            type: "file"
        },
        date: {
            name: "Date",
            type: "date"
        },
        catalogue: {
            name: "Catalogue",
            type: "catalogue"
        }
    });
})();
