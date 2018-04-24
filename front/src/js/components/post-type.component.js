(function(){
    angular.module('frodo').component('postType', {
        templateUrl: 'html/components/post-type.html',
        controllerAs: 'vm',
        bindings: {
            postType: '<'
        },
        controller: PostTypeController
    });

    PostTypeController.$inject = ['$scope', '$compile', '$injector', '$rootScope', '$location', '$state', '$mdMedia', 'tools'];
    function PostTypeController($scope, $compile, $injector, $rootScope, $location, $state, $mdMedia, tools){
        var vm  = this;
        vm.$mdMedia = $mdMedia;
        var fieldsElement = angular.element(document.querySelector('#postFields'));
        vm.$onInit = onInit;
        vm.save = save;
        vm.removeDialog = removeDialog;
        vm.addField = addField;
        vm.formatTypeString = formatTypeString;
        vm.setForm = setForm;

        var api;

        function onInit(){
            if($state.current.name === 'postTypesEdit' || $state.current.name === 'componentsEdit') vm.edit = true;
            api = $injector.get($state.current.family + 'Service');
            if($state.current.family === 'components'){
                vm.type = 'component';
                vm.model = {
                    title: '',
                    type: '',
                    fields: []
                };
            } else {
                vm.type = 'post type';
                vm.model = {
                    title: '',
                    pluralTitle: '',
                    type: '',
                    fields: [],
                    posts: []
                };
            }

            if(vm.edit){
                vm.model = vm.postType.data;
                vm.currentType = vm.model.type;
                vm.fieldsNumber = new Array(vm.model.fields.length);
            }
        }

        function addField(){
            var html = '<add-field model="vm.model.fields" form="vm.form"></add-field>';
            var newField = $compile(html)($scope);
            fieldsElement.append(newField);
        }

        function formatTypeString(){
            if(vm.model.type){
                vm.model.type = vm.model.type.replace(/\s+/g, "_").toLowerCase();
            }
        }

        function save(ev){
            vm.form.$submitted = true;
            if(vm.form.$valid){
                vm.actionStatus = 'save';
                var promise = vm.edit ? api.edit(vm.model) : api.create(vm.model);

                promise
                    .then(function(response){
                        $rootScope.$broadcast('postTypesUpdated');
                        if(vm.edit){
                            vm.actionStatus = '';
                            vm.model = response.data;
                            vm.currentType = vm.model.type;
                            tools.infoDialog(vm.model.type + ' updated successfully', ev);
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
            api.remove(vm.model._id)
                .then(function(){
                    $rootScope.$broadcast('postTypesUpdated');
                    $location.path('/post-types');
                })
                .catch(function(err){
                    vm.actionStatus = '';
                    tools.infoDialog('There was error removing ' + vm.model.type + ' ' + vm.type, ev);
                })
        }

        function removeDialog(ev){
            tools.removeDialog(ev, remove, 'Are you sure you want to delete ' + vm.model.type + '?')
        }

        function setForm(form){
            vm.form = form;
        }

    }
})();