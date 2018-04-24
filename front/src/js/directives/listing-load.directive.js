(function(){
    angular.module('frodo').directive('listingLoad',[ function(){
        return {
            restrict: 'A',
            link: link,
            scope: {
                listingLoadFunction: "<",
                listingLoad: "<"
            }
        };
        function link(scope, element, attr){

            var el = element[0];

            var loadPercentage = scope.listingLoad || 80;

            function load(){
                var scrollPercentage = Math.floor((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
                if(scrollPercentage > loadPercentage){
                    scope.listingLoadFunction();
                }
            }

            element.bind('scroll', load);

            scope.$on('loadFinished', function(){
                element.unbind('scroll', load);
            })
        }
    }])
})();