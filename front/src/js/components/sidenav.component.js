(function(){
    angular.module('frodo').component('sidenav', {
        templateUrl: 'html/components/sidenav.html',
        controllerAs: 'vm',
        controller: SidenavController
    });

    SidenavController.$inject = ['postTypesService', '$location', '$scope', '$transitions', '$state', 'userService'];
    function SidenavController(postTypesService, $location, $scope, $transitions, $state, userService){
        var vm  = this;
        vm.$onInit = onInit;
        vm.redirect = redirect;
        vm.logout = logout;
        vm.userService = userService;

        vm.navigation = [
            {
                title: 'Pages',
                family: 'pages',

            },
            {
                title: 'Components',
                family: 'components',

            },
            {
                title: 'Post Types',
                family: 'postTypes',

            },
            {
                title: 'Files',
                family: 'files',

            }
        ];

        function onInit(){
            getPostTypes();
            if($state.current.family){
                $state.params.type ? setCurrentFamily($state.current.family, $state.params.type) : setCurrentFamily($state.current.family);
            } else {
                vm.currentFamily = undefined;
            }

            $scope.$on('postTypesUpdated', getPostTypes);
            $transitions.onSuccess({}, function ($transition$) {
                if($transition$.$to().self.family){
                    $transition$.params().type ? setCurrentFamily($transition$.$to().self.family, $transition$.params().type) : setCurrentFamily($transition$.$to().self.family);
                } else {
                    vm.currentFamily = undefined;
                }
            })
        }

        function redirect(to, params){
            $state.go(to, params)
        }

        function setCurrentFamily(family, type){
            if(family) {
                if(family === 'posts'){
                    vm.currentFamily = type ? family + type : undefined;
                } else {
                    vm.currentFamily = family;
                }
            } else{
                vm.currentFamily = undefined;
            }
        }

        function getPostTypes(){
            postTypesService.getAll()
                .then(function(response){
                    vm.postTypes = response.data;
                })
        }

        function logout(){
            vm.logoutStatus = true;
            userService.logout()
                .then(function(response){
                    vm.logoutStatus = false;
                    userService.setUser();
                    $location.path('/login');
                })
                .catch(function(err){
                    vm.logoutStatus = false;
                    console.log(err);
                })
        }

    }
})();