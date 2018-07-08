(function() {
    angular.module("frodo").run([
        "userService",
        function(userService) {
            userService
                .user()
                .then(function(response) {
                    var user = response.data;
                    if (user) {
                        userService.setUser(user.username, user.id, 1);
                    } else {
                        userService.setUser();
                    }
                })
                .catch(function(err) {
                    console.log(err);
                });
        }
    ]);
})();
