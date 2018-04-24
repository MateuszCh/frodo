(function(){
    angular.module('frodo').component('account',{
        templateUrl: '/html/components/account.html',
        controller: AccountController,
        controllerAs: 'vm',
        bindings: {
            user: '<'
        }
    });

    AccountController.$inject = ['userService', 'tools'];
    function AccountController(userService, tools){
        var vm = this;
        vm.$onInit = onInit;
        vm.setForm = setForm;
        vm.changePassword = changePassword;
        vm.data = {};

        function onInit(){
            vm.user = vm.user.data;
            vm.data.id = vm.user.id;
        }

        function setForm(form){
            vm.form = form;
        }

        function changePassword(ev){
            vm.form.$submitted = true;
            if(vm.form.$valid){
                vm.passwordStatus = true;
                vm.errorMessage = undefined;
                vm.successMessage = undefined;
                userService.changePassword(vm.data)
                    .then(function(response){
                        vm.passwordStatus = false;
                        vm.successMessage = "Password changed successfully";
                    })
                    .catch(function(err){
                        vm.passwordStatus = false;
                        vm.errorMessage = err.data.error;
                    })
            } else {
                tools.scrollToError();
            }
        }

    }
})();