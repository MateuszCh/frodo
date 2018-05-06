(function(){
    angular.module('frodo').component('field', {
        templateUrl: 'html/components/field.html',
        controllerAs: 'vm',
        bindings: {
            model: '=',
            field: '<',
        },
        controller: FieldController
    });

    FieldController.$inject = ['$scope', '$mdDialog', 'filesService'];
    function FieldController($scope, $mdDialog, filesService){
        var vm  = this;
        vm.showFilePopup = false;

        vm.$onInit = onInit;
        vm.showFiles = showFiles;

        function onInit(){
            if(vm.field.type === 'select' && !vm.field.options){
                setOptions(vm.field);
            }
            vm.catalogues = filesService.getCatalogues();
        }

        function setOptions(field){
            var selectOptions = field.selectOptions.replace(/\s*;\s*/g, ";").split(";");
            var options = [];
            selectOptions.forEach(function(option){
                options.push(option.replace(/;/g, ""));
            });
            options = options.filter(function(value, index, self){
                return self.indexOf(value) === index;
            });
            field.options = options;
        }

        function showFiles(ev){
            $mdDialog.show({
                controller: FilesDialogController,
                templateUrl: 'html/files-dialog.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                fullscreen: true,
                clickOutsideToClose: true
            }).then(function(answer){
                if(answer) vm.model[vm.field.id] = answer.src;
            }, function(){})
        }

    }

    FilesDialogController.$inject = ['$scope', '$mdDialog'];

    function FilesDialogController($scope, $mdDialog){
        $scope.hide = function(){
            $mdDialog.hide();
        }
    }
})();