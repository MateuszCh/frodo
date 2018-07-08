(function() {
    angular.module("frodo").component("post", {
        templateUrl: "html/components/post.html",
        controllerAs: "vm",
        bindings: {
            post: "<",
            postType: "<"
        },
        controller: PostController
    });

    PostController.$inject = [
        "postsService",
        "$location",
        "tools",
        "$state",
        "$mdMedia"
    ];
    function PostController(postsService, $location, tools, $state, $mdMedia) {
        var vm = this;
        vm.$onInit = onInit;
        vm.$mdMedia = $mdMedia;
        vm.save = save;
        vm.setForm = setForm;
        vm.removeDialog = removeDialog;

        vm.model = {
            title: "",
            type: "",
            data: {}
        };

        function onInit() {
            if ($state.current.name === "postsEdit") vm.edit = true;
            vm.postType = vm.postType.data;
            if (vm.edit) {
                vm.model = vm.post.data;
                if (!vm.model.data) {
                    vm.model.data = {};
                }
                checkModel();
            } else {
                vm.model.type = vm.postType.type;
            }
        }

        function checkModel() {
            var validIds = [];
            vm.postType.fields.forEach(function(field) {
                validIds.push(field.id);
            });
            if (vm.model.data) {
                for (var prop in vm.model.data) {
                    if (validIds.indexOf(prop) < 0) {
                        delete vm.model.data[prop];
                    }
                }
            }
        }

        function save(ev) {
            vm.form.$submitted = true;
            if (vm.form.$valid) {
                vm.actionStatus = "save";

                // vm.postType.fields.forEach(function(field){
                //     if(!vm.model.data[field.id] && field.type === 'checkbox'){
                //         vm.model.data[field.id] = false;
                //     }
                // });

                var promise = vm.edit
                    ? postsService.edit(vm.model)
                    : postsService.create(vm.model);

                promise
                    .then(function(response) {
                        if (vm.edit) {
                            vm.actionStatus = "";
                            vm.model = response.data;
                            tools.infoDialog(
                                vm.model.title + " updated successfully",
                                ev
                            );
                        } else {
                            $location.path(response.data.url);
                        }
                    })
                    .catch(function(err) {
                        vm.actionStatus = "";
                        tools.infoDialog(err.data.error || err.data, ev);
                    });
            } else {
                tools.scrollToError();
            }
        }

        function remove(ev) {
            vm.actionStatus = "remove";
            postsService
                .remove(vm.model._id)
                .then(function() {
                    $location.path("/posts/" + vm.postType.type);
                })
                .catch(function(err) {
                    vm.actionStatus = "";
                    tools.infoDialog(
                        "There was error removing " +
                            (vm.model.title || vm.model.type + " post"),
                        ev
                    );
                });
        }

        function removeDialog(ev) {
            tools.removeDialog(
                ev,
                remove,
                "Are you sure you want to delete " +
                    (vm.model.title || vm.model.type + " post") +
                    "?"
            );
        }

        function setForm(form) {
            vm.form = form;
        }
    }
})();
