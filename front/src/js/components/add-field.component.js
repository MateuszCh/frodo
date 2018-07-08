(function() {
    angular.module("frodo").component("addField", {
        templateUrl: "html/components/add-field.html",
        controllerAs: "vm",
        bindings: {
            model: "=",
            order: "<",
            edit: "<",
            form: "<",
            repeat: "@"
        },
        controller: AddFieldController
    });

    AddFieldController.$inject = [
        "$element",
        "fields",
        "$rootScope",
        "$scope",
        "$compile"
    ];
    function AddFieldController(
        $element,
        fields,
        $rootScope,
        $scope,
        $compile
    ) {
        var vm = this;
        vm.remove = remove;
        vm.addRepeaterField = addRepeaterField;
        vm.formatIdString = formatIdString;

        var repeaterFieldsElement = $element[0].querySelectorAll(
            ".repeaterFields"
        )[0];

        vm.fieldModel = {
            type: undefined,
            title: undefined,
            id: undefined,
            selectOptions: undefined,
            multiselectOptions: undefined,
            repeaterFields: []
        };

        vm.$onInit = function() {
            vm.fields = fields;
            if (vm.edit) {
                vm.fieldModel = vm.model[vm.order];

                if (vm.fieldModel.type === "repeater") {
                    vm.repeaterFieldsNumber = new Array(
                        vm.fieldModel.repeaterFields.length
                    );
                }
            } else {
                vm.order = vm.model.push(vm.fieldModel) - 1;
                vm.fieldModel.type = "text";
            }
            $scope.$on("fieldRemoved", function(e, position) {
                if (position < vm.order) {
                    vm.order--;
                }
            });

            $scope.$on("postTypeSaved", function() {
                vm.fieldModel = vm.model[vm.order];
            });
        };

        function remove() {
            $rootScope.$broadcast("fieldRemoved", vm.order);
            vm.model.splice(vm.order, 1);
            $element.remove();
        }

        function addRepeaterField() {
            var html =
                '<add-field model="vm.fieldModel.repeaterFields" form="vm.form" repeat="{{vm.repeat ? vm.repeat + vm.order : vm.order}}"></add-field>';
            var newField = $compile(html)($scope);
            repeaterFieldsElement.append(newField[0]);
        }

        function formatIdString() {
            if (vm.fieldModel.id) {
                vm.fieldModel.id = vm.fieldModel.id
                    .replace(/\s+/g, "_")
                    .toLowerCase();
            }
        }
    }
})();
