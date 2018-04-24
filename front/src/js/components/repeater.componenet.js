(function(){
    angular.module('frodo').component('repeater', {
        templateUrl: 'html/components/repeater.html',
        controllerAs: 'vm',
        bindings: {
            parentModel: '=',
            field: '<',
            repeaterFields: '<'
        },
        controller: RepeaterController
    });

    RepeaterController.$inject = [];
    function RepeaterController(){
        var vm  = this;

        vm.$onInit = onInit;
        vm.removeRow = removeRow;
        vm.addRow = addRow;

        function onInit(){
            if(!vm.parentModel[vm.field.id]){
                vm.parentModel[vm.field.id] = [];
            }
            vm.model = vm.parentModel[vm.field.id];
            checkModel();
        }

        function removeRow(index){
            vm.model.splice(index, 1);
        }

        function addRow(){
            vm.model.push({});
        }

        function checkModel(){
            var validIds = [];
            vm.field.repeaterFields.forEach((function(field){
                validIds.push(field.id);
            }));
            if(vm.model[0]){
                vm.model.forEach(function(model){
                    for(var prop in model){
                        if(validIds.indexOf(prop) < 0){
                            delete model[prop];
                        }
                    }
                })
            }
        }

    }
})();