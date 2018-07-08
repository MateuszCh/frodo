(function() {
    angular.module("frodo").component("listing", {
        templateUrl: "html/components/listing.html",
        controllerAs: "vm",
        bindings: {
            model: "<"
        },
        controller: ListingController
    });

    ListingController.$inject = [
        "$filter",
        "listingFactory",
        "$mdSidenav",
        "$mdMedia",
        "$rootScope",
        "$scope"
    ];
    function ListingController(
        $filter,
        listingFactory,
        $mdSidenav,
        $mdMedia,
        $rootScope,
        $scope
    ) {
        var vm = this;
        vm.$onInit = onInit;
        vm.$mdMedia = $mdMedia;
        vm.openFilters = openFilters;
        vm.incrementLimit = incrementLimit;
        vm.limit = 20;
        var increment = 10;

        function onInit() {
            vm.listing = listingFactory.create(vm.model);
        }

        function openFilters() {
            $mdSidenav("filters").open();
        }

        function incrementLimit() {
            if (vm.listing.models.length > vm.limit) {
                vm.limit += increment;
                $scope.$apply();
            }
            if (vm.limit >= vm.listing.models.length) {
                $rootScope.$broadcast("loadFinished");
            }
        }
    }
})();
