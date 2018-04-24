(function(){
    angular.module('frodo').run(['userService',
        function (userService) {
        userService.user()
            .then(function(response){
                var user = response.data;
                userService.setUser(user.username, user.id, 1);
            })
            .catch(function(err){
                console.log(err);
            });
        }
    ]);
})();