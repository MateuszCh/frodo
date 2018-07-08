(function() {
    angular.module("frodo").directive("imageLoaded", function() {
        return {
            restrict: "A",
            link: link
        };
        function link(scope, element, attr) {
            if (attr.imageLoaded) {
                var img = element.find("img");
                img.bind("load", function() {
                    element.addClass(attr.imageLoaded);
                });
            }
        }
    });
})();
