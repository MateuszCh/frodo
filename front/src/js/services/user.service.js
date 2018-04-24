(function(){
    angular.module('frodo').service('userService', ['requestService', function(requestService){

        var _user = {
            username: undefined,
            id: undefined,
            logged: 0
        };

        function setUser(username, id, logged){
            _user.username = username;
            _user.id = id;
            _user.logged = logged || 0;
            _user.loaded = new Date().getTime();
        }

        function getUser(){
            return _user;
        }

        function isLogged(){
            return _user.logged;
        }

        function login(data){
            return requestService.send('/user/login', 'POST', data);
        }

        function logout(){
            return requestService.send('/user/logout', 'GET');
        }

        function exist(){
            return requestService.send('/user/exist', 'GET');
        }

        function isAuthenticated(){
            return requestService.send('/user/isAuthenticated', 'GET');
        }

        function user(){
            return requestService.send('/user', 'GET');
        }

        function changePassword(data){
            return requestService.send('/user/changePassword', 'POST', data);
        }

        return {
            login: login,
            logout: logout,
            exist: exist,
            isAuthenticated: isAuthenticated,
            setUser: setUser,
            getUser: getUser,
            isLogged: isLogged,
            user: user,
            changePassword: changePassword
        }
    }])
})();