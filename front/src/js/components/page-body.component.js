(function(){
    angular.module('frodo').component('pageBody', {
        templateUrl: 'html/components/page-body.html',
        controllerAs: 'vm',
        controller: PageBodyController
    });

    PageBodyController.$inject = ['$mdSidenav', '$timeout', '$transitions', '$window', 'tools', '$scope', '$document', '$mdMedia', '$state'];
    function PageBodyController($mdSidenav, $timeout, $transitions, $window, tools, $scope, $document, $mdMedia, $state){
        var vm  = this;
        vm.$onInit = onInit;
        vm.$mdMedia = $mdMedia;
        vm.openSidenav = openSidenav;
        vm.openFilters = openFilters;
        vm.scroll = scroll;

        var scrollEl;


        var throttledOnScroll = tools.throttle(onScroll, 100);

        function onInit(){
            vm.login = $state.current.name === 'login';
            $transitions.onSuccess({}, function(e){
                vm.login = $state.current.name === 'login';
                $timeout(closeSidenav, 150);
                $timeout(registerScroll, 1000);
                vm.scrolled = false;
            });
        }

        function registerScroll(){
            if(scrollEl){
                scrollEl.off('scroll', throttledOnScroll);
            }
            scrollEl = angular.element(document.querySelector('#scroll'));
            if(scrollEl){
                scrollEl.on('scroll', throttledOnScroll);
            }
        }

        function onScroll(){
            vm.scrolled = scrollEl.scrollTop() > 0;
            $scope.$apply();
        }

        function scroll(){
            scrollEl.scrollTopAnimated(0);
        }

        function openSidenav(){
            $mdSidenav('sidenav').open();
        }

        function closeSidenav(){
            $mdSidenav('sidenav').close();
        }

        function openFilters(){
            if($state.current.name === 'posts'){
                $mdSidenav('filters').open();
            }
        }
    }
})();