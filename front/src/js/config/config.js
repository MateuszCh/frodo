(function() {
    angular.module("frodo").config([
        "$locationProvider",
        function($locationProvider) {
            $locationProvider.hashPrefix("");
            $locationProvider.html5Mode(true);
        }
    ]);
})();
