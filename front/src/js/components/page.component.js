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

    PageController.$inject = ['pagesService', '$rootScope', '$location', '$timeout', '$state', '$mdMedia', 'tools'];
    function PageController(pagesService, $rootScope, $location, $timeout, $state, $mdMedia, tools){
        var vm  = this;
        vm.$mdMedia = $mdMedia;
        vm.$onInit = onInit;
        vm.setForm = setForm;
        vm.save = save;
        vm.removeDialog = removeDialog;
        vm.addComponent = addComponent;
        vm.removeComponent = removeComponent;
        vm.onDrop = onDrop;

        var componentsElement = angular.element(document.querySelector('#components'));

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
            }
        }

        function addComponent(){
            vm.model.rows.push({
                data: {},
                title: '',
                type: ''
            })
        }

        function removeComponent(i){
            componentsElement[0].children[vm.model.rows.length - 1].remove();
            vm.model.rows.splice(i, 1);
            $timeout(function(){
                $rootScope.$broadcast('componentRemoved');
            }, 100);
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

        function onDrop(index, item, callback){
            var indexFrom = callback();

            if(!(indexFrom === index || indexFrom + 1 === index)){
                vm.model.rows.splice(indexFrom, 1);
                vm.model.rows.splice(indexFrom < index ? index-1 : index, 0, item);
                $timeout(function(){
                    $rootScope.$broadcast('componentDropped');
                }, 10);
            }
            return true;
        }

    }
})();