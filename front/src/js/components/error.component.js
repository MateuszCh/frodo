(function(){
    angular.module('frodo').component('error', {
        templateUrl: 'html/components/error.html',
        controllerAs: 'vm',
        controller: ErrorController
    });

    ErrorController.$inject = ['$state'];
    function ErrorController($state){
        var vm  = this;
        vm.$onInit = onInit;

        function onInit(){
            vm.errorMessage = $state.current.error || 'We can\'t find that page';
        }
    }
})();