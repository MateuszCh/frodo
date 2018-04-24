(function(){
    angular.module('frodo').service('tools', ['$document', '$window', '$mdDialog', '$timeout', function($document, $window, $mdDialog, $timeout){

        function scrollToError(){
            var errorEl = angular.element(document.querySelectorAll('ui-view .ng-invalid'));
            var scrollEl = angular.element(document.querySelector('#scroll'));

            if(scrollEl[0].clientHeight !== scrollEl[0].scrollHeight){
                var diff = scrollEl.scrollTop() - errorEl[1].parentNode.offsetTop + 16;
                if(diff !== 0){
                    scrollEl.scrollToElementAnimated(errorEl[1], 18);
                }
            }
        }

        // Returns a function, that, when invoked, will only be triggered at most once
        // during a given window of time. Normally, the throttled function will run
        // as much as it can, without ever going more than once per `wait` duration;
        // but if you'd like to disable the execution on the leading edge, pass
        // `{leading: false}`. To disable execution on the trailing edge, ditto.
        function throttle(func, wait, options) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            if (!options) options = {};
            var later = function() {
                previous = options.leading === false ? 0 : Date.now();
                timeout = null;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            };
            return function() {
                var now = Date.now();
                if (!previous && options.leading === false) previous = now;
                var remaining = wait - (now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout) context = args = null;
                } else if (!timeout && options.trailing !== false) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        }


        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        function debounce(func, wait, immediate) {
            var timeout, args, context, timestamp, result;

            var later = function() {
                var last = Date.now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) context = args = null;
                    }
                }
            };

            return function() {
                context = this;
                args = arguments;
                timestamp = Date.now();
                var callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            };
        }

        function infoDialog(info, ev){
            $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.querySelector('body')))
                    .clickOutsideToClose(true)
                    .textContent(info)
                    .multiple(true)
                    .ariaLabel('Error dialog')
                    .ok('Ok')
                    .targetEvent(ev)
            )
        }

        function removeDialog(ev, callback, text){
            var confirm = $mdDialog.confirm()
                .title(text)
                .ariaLabel('Remove dialog')
                .clickOutsideToClose(true)
                .targetEvent(ev)
                .ok('Yes')
                .multiple(true)
                .cancel('No');
            $mdDialog.show(confirm)
                .then(function(){
                    callback(ev);
                }, function(){});
        }

        return {
            scrollToError: scrollToError,
            throttle: throttle,
            debounce: debounce,
            infoDialog: infoDialog,
            removeDialog: removeDialog
        }

    }]);
})();