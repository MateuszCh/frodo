(function() {
    angular.module("frodo").component("addComponent", {
        templateUrl: "html/components/add-component.html",
        controllerAs: "vm",
        bindings: {
            components: "<",
            model: "=",
            order: "@",
            removeFunction: "<"
        },
        controller: AddComponentController
    });

    AddComponentController.$inject = ["$scope"];
    function AddComponentController($scope) {
        var vm = this;
        vm.onComponentSelect = onComponentSelect;
        vm.open = false;
        vm.currentComponent = undefined;

        vm.$onInit = onInit;

        function onInit() {
            if (vm.model.type) {
                vm.currentComponent = vm.components[vm.model.type];
            }
            $scope.$on("componentRemoved", onComponentsEvent);
            $scope.$on("componentDropped", onComponentsEvent);
        }

        function onComponentsEvent() {
            vm.currentComponent = vm.components[vm.model.type] || undefined;
            vm.open = false;
            $scope.$apply();
        }

        function onComponentSelect() {
            vm.open = true;
            vm.model.data = {};
            vm.model.title = vm.currentComponent.title;
            vm.model.type = vm.currentComponent.type;
        }
    }
})();
