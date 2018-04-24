(function(){
    angular.module('frodo').directive('ngEnter', function(){
        return {
            restrict: 'A',
            link: link
        };
        function link(scope, element, attrs){
            element.bind("keydown keypress", function(e){
                if(e.which === 13){
                    scope.$apply(function(){
                        scope.$eval(attrs.ngEnter, {'event': event});
                    });
                    e.preventDefault();
                }
            })
        }
    })
})();