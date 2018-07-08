(function() {
    angular.module("frodo").component("header", {
        templateUrl: "html/components/header.html",
        controllerAs: "vm",
        controller: HeaderController
    });

    HeaderController.$inject = ["$mdSidenav"];
    function HeaderController($mdSidenav) {
        var vm = this;

        vm.toggleSidenav = toggleSidenav;

        function toggleSidenav() {
            $mdSidenav("sidenav").toggle();
        }
    }
})();
