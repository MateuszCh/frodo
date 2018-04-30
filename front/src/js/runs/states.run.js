(function(){
    angular.module('frodo').run(['$rootScope', '$state', '$transitions', 'userService',
        function ($rootScope, $state, $transitions, userService) {

            $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error){
                event.preventDefault();
                if(error.detail && error.detail.data){
                    $state.get('error').error = error.detail.data.error;
                }
                return $state.go('error');
            });

            $transitions.onBefore({}, function(transition){
                if(transition.to().name !== 'login'){
                    return userService.isAuthenticated()
                        .catch(function(err){
                            userService.setUser();
                            return transition.router.stateService.target('login');
                        })
                }
            });
        }
    ]);
})();