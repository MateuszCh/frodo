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
            vm.catalogues = filesService.getCatalogues();
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