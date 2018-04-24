(function(){
    angular.module('frodo').component('page', {
        templateUrl: 'html/components/page.html',
        controllerAs: 'vm',
        bindings: {
            components: '<',
            page: '<'
        },
        controller: PageController
    });

    PageController.$inject = ['$scope', '$compile', 'pagesService', '$rootScope', '$location', '$timeout', '$state', '$mdMedia', 'tools'];
    function PageController($scope, $compile, pagesService, $rootScope, $location, $timeout, $state, $mdMedia, tools){
        var vm  = this;
        vm.$mdMedia = $mdMedia;
        var componentsElement = angular.element(document.querySelector('#components'));
        vm.$onInit = onInit;
        vm.setForm = setForm;
        vm.save = save;
        vm.removeDialog = removeDialog;
        vm.addComponent = addComponent;

        vm.model = {
            title: '',
            pageUrl: '',
            rows: []
        };

        function onInit(){
            if($state.current.name === 'pagesEdit') vm.edit = true;
            var componentsObject = {};
            vm.components.data.forEach(function(component){
                componentsObject[component.type] = component;
            });
            vm.components = componentsObject;
            if(vm.edit){
                vm.model = vm.page.data;
                vm.currentTitle = vm.model.title;
                vm.rowsNumber = new Array(vm.model.rows.length);
            }
        }

        function addComponent(){
            var html = '<add-component rows="vm.model.rows" components="::vm.components"></add-component>';
            var newComponent = $compile(html)($scope);
            componentsElement.append(newComponent);
        }

        function save(ev){
            vm.form.$submitted = true;
            if(vm.form.$valid){
                vm.actionStatus = 'save';
                var promise = vm.edit ? pagesService.edit(vm.model) : pagesService.create(vm.model);

                promise
                    .then(function(response){
                        if(vm.edit){
                            vm.actionStatus = '';
                            vm.model = response.data;
                            $timeout(function(){
                                $rootScope.$broadcast("pageSaved");
                            }, 10);
                            vm.currentTitle = vm.model.title;
                            tools.infoDialog(vm.model.title + " page updated successfully", ev);
                        } else {
                            $location.path(response.data.url);
                        }
                    })
                    .catch(function(err){
                        vm.actionStatus = '';
                        tools.infoDialog(err.data.error || err.data, ev);
                    })
            } else {
                tools.scrollToError();
            }


        }

        function remove(ev){
            vm.actionStatus = 'remove';
            pagesService.remove(vm.model._id)
                .then(function(){
                    $location.path('/pages');
                })
                .catch(function(err){
                    vm.actionStatus = '';
                    tools.infoDialog('There was error removing ' + vm.model.title + ' page', ev);
                })
        }

        function removeDialog(ev){
            tools.removeDialog(ev, remove, 'Are you sure you want to delete ' + vm.model.title + '?');
        }

        function setForm(form){
            vm.form = form;
        }

    }
})();