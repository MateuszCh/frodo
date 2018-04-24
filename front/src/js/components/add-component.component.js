(function(){
    angular.module('frodo').component('addComponent', {
        templateUrl: 'html/components/add-component.html',
        controllerAs: 'vm',
        bindings: {
            rows: '=',
            order: '<',
            edit: '<',
            components: '<'
        },
        controller: AddComponentController
    });

    AddComponentController.$inject = ['$element', '$rootScope', '$scope'];
    function AddComponentController($element, $rootScope, $scope){
        var vm  = this;
        vm.remove = remove;
        vm.onComponentSelect = onComponentSelect;

        vm.currentComponent = undefined;

        vm.model = {
            data : {},
            title: '',
            type: ''
        };

        vm.$onInit = onInit;

        function onInit(){
            if(vm.edit){
                vm.model = vm.rows[vm.order];
                vm.currentComponent = vm.components[vm.model.type];
            } else {
                vm.order = vm.rows.push(vm.model) - 1;
            }

            $scope.$on('componentRemoved', function(e, position){
                if(position < vm.order){
                    vm.order--;
                }
            });

            $scope.$on('pageSaved', function(){
                vm.model = vm.rows[vm.order];
            })

        }

        function onComponentSelect(){
            vm.model.data = {};
            vm.model.title = vm.currentComponent.title;
            vm.model.type = vm.currentComponent.type;
        }

        function remove(){
            $rootScope.$broadcast('componentRemoved', vm.order);
            vm.rows.splice(vm.order, 1);
            $element.remove();
        }

    }
})();