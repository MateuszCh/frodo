(function() {
    angular.module("frodo").service("listingFactory", ListingFactory);

    ListingFactory.$inject = [
        "$state",
        "$injector",
        "$timeout",
        "$rootScope",
        "$mdDialog",
        "$filter",
        "filesService",
        "tools"
    ];

    function ListingFactory(
        $state,
        $injector,
        $timeout,
        $rootScope,
        $mdDialog,
        $filter,
        filesService,
        tools
    ) {
        function setRange(modelData, id, dates) {
            var values = [];
            modelData.posts.forEach(function(post) {
                values.push(post.data[id]);
            });
            values = values.filter(function(value) {
                return value !== undefined && value !== null;
            });
            if (!values.length) {
                return undefined;
            }
            values = $filter("orderBy")(values);
            return dates
                ? [new Date(values[0]), new Date(values[values.length - 1])]
                : [Math.floor(values[0]), Math.ceil(values[values.length - 1])];
        }

        function createFilters(modelData) {
            if ($state.current.family !== "posts") {
                return {
                    textFilter: {
                        type: "text",
                        value: undefined
                    }
                };
            }
            if (!modelData.fields.length) {
                return undefined;
            }
            var checkboxes = { type: "checkbox", fields: [] };
            var numbers = { type: "number", fields: [] };
            var selects = { type: "select", fields: [] };
            var multiselects = { type: "multiselect", fields: [] };
            var dates = { type: "date", fields: [] };
            var catalogues = { type: "catalogue", fields: [] };

            var filterableFields = [
                "checkbox",
                "number",
                "select",
                "multiselect",
                "date",
                "catalogue"
            ];

            modelData.fields.forEach(function(field) {
                if (filterableFields.indexOf(field.type) > -1) {
                    var filterField = {
                        id: field.id,
                        title: field.title
                    };
                    switch (field.type) {
                        case "checkbox":
                            filterField.value = "all";
                            checkboxes.fields.push(filterField);
                            break;
                        case "number":
                            filterField.range = setRange(
                                modelData,
                                filterField.id
                            );
                            if (filterField.range) {
                                filterField.minValue = filterField.range[0];
                                filterField.maxValue = filterField.range[1];
                                numbers.fields.push(filterField);
                            }
                            break;
                        case "select":
                            filterField.options = field.options;
                            filterField.values = [];
                            selects.fields.push(filterField);
                            break;
                        case "multiselect":
                            filterField.multiOptions = field.multiOptions;
                            filterField.values = [];
                            multiselects.fields.push(filterField);
                            break;
                        case "date":
                            filterField.range = setRange(
                                modelData,
                                filterField.id,
                                true
                            );
                            if (filterField.range) {
                                filterField.minValue = filterField.range[0];
                                filterField.maxValue = filterField.range[1];
                                dates.fields.push(filterField);
                            }
                            break;
                        case "catalogue":
                            filterField.options = filesService.getCatalogues();
                            filterField.values = [];
                            catalogues.fields.push(filterField);
                            break;
                    }
                }
            });

            return {
                textFilter: {
                    type: "text",
                    value: undefined
                },
                checkboxes: checkboxes,
                numbers: numbers,
                selects: selects,
                multiselects: multiselects,
                dates: dates,
                catalogues: catalogues
            };
        }

        function resetFilters(filters, type) {
            filters.textFilter.value = undefined;
            if (type !== "posts") {
                return;
            }
            filters.checkboxes.fields.forEach(function(field) {
                field.value = "all";
            });
            filters.numbers.fields.forEach(function(field) {
                field.minValue = field.range[0];
                field.maxValue = field.range[1];
            });
            filters.selects.fields.forEach(function(field) {
                field.values = [];
            });
            filters.multiselects.fields.forEach(function(field) {
                field.values = [];
            });
            filters.dates.fields.forEach(function(field) {
                field.minValue = field.range[0];
                field.maxValue = field.range[1];
            });
            filters.catalogues.fields.forEach(function(field) {
                field.values = [];
            });
        }

        function onRemoveError(error, ev) {
            $mdDialog.show(
                $mdDialog
                    .alert()
                    .parent(angular.element(document.querySelector("body")))
                    .clickOutsideToClose(true)
                    .textContent(error)
                    .ariaLabel("Error dialog")
                    .ok("Ok")
                    .targetEvent(ev)
            );
        }

        function createSort(listing, fields) {
            var sort = {
                sortBy: function(varName) {
                    this.currentType = varName;
                    sessionStorage.setItem("sorting." + listing.id, varName);
                },
                currentType:
                    sessionStorage.getItem("sorting." + listing.id) ||
                    "created",
                types: [
                    { name: "newest", varName: "-created" },
                    { name: "oldest", varName: "created" },
                    { name: "title", varName: "title" }
                ]
            };

            if (listing.type === "posts") {
                var sortingFields = [
                    "text",
                    "checkbox",
                    "select",
                    "number",
                    "date",
                    "catalogue"
                ];
                fields.forEach(function(field) {
                    if (sortingFields.indexOf(field.type) > -1) {
                        var negative = "";
                        if (field.type === "checkbox") negative = "-";
                        sort.types.push({
                            name: field.title,
                            varName: negative + "data_" + field.id
                        });
                    }
                });
            }
            return sort;
        }

        function createListing(model) {
            var listing = {
                type: $state.current.family,
                models: model.data.posts || model.data,
                id: model.data.id || $state.current.family,
                add: function() {
                    $state.go(
                        this.type + "Add",
                        this.postType ? { type: this.postType } : undefined
                    );
                },
                postTypeEdit: function() {
                    $state.go("postTypesEdit", { id: this.postTypeId });
                },
                apiService: $injector.get($state.current.family + "Service"),
                removeStatus: undefined,
                setRemoveStatus: function(id, result, status) {
                    this.removeStatus = {
                        busy: id || false,
                        result: result || "",
                        status: status || undefined
                    };
                },
                removeTimeout: undefined,
                lastRemoved: undefined,
                remove: function(model, ev) {
                    $timeout.cancel(this.removeTimeout);
                    if (this.lastRemoved) {
                        this.models.splice(
                            this.models.indexOf(this.lastRemoved),
                            1
                        );
                        this.lastRemoved = undefined;
                    }
                    this.setRemoveStatus(model._id);
                    var self = this;
                    this.apiService
                        .remove(model._id)
                        .then(function(response) {
                            self.setRemoveStatus(
                                model._id,
                                response.data,
                                response.status
                            );
                            if (self.type === "postTypes")
                                $rootScope.$broadcast("postTypesUpdated");
                            self.lastRemoved = model;
                            self.count--;
                            self.removeTimeout = $timeout(function() {
                                self.models.splice(
                                    self.models.indexOf(model),
                                    1
                                );
                                self.lastRemoved = undefined;
                                self.setRemoveStatus();
                            }, 2000);
                        })
                        .catch(function(error) {
                            self.setRemoveStatus();
                            onRemoveError(error.data, ev);
                        });
                },
                importStatus: undefined,
                importClickEvent: undefined,
                importPosts: function(e) {
                    var self = this;
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var posts = JSON.parse(e.target.result);

                        if (posts.length) {
                            var data = {
                                posts: posts
                            };
                            if (self.postType) data.postType = self.postType;

                            self.importStatus = true;
                            self.apiService
                                .importPosts(data)
                                .then(function(response) {
                                    self.importStatus = false;
                                    var currentLength;
                                    if (response.data.posts) {
                                        currentLength =
                                            response.data.posts.length;
                                    } else {
                                        currentLength = response.data.length;
                                    }
                                    var added = currentLength - self.count;
                                    self.models =
                                        response.data.posts || response.data;
                                    self.count = currentLength;
                                    if (self.type === "posts") {
                                        self.sort = createSort(
                                            self,
                                            response.data.fields
                                        );
                                        self.filters = createFilters(
                                            response.data
                                        );
                                    }
                                    if ($state.current.family === "postTypes")
                                        $rootScope.$broadcast(
                                            "postTypesUpdated"
                                        );
                                    tools.infoDialog(
                                        added +
                                            " " +
                                            self.title +
                                            (added > 1 ? " were" : " was") +
                                            " successfully imported",
                                        self.importClickEvent
                                    );
                                })
                                .catch(function(error) {
                                    self.importStatus = false;
                                    tools.infoDialog(
                                        error.data.error,
                                        self.importClickEvent
                                    );
                                });
                        } else {
                            tools.infoDialog(
                                "There is no correct posts to import",
                                e
                            );
                        }
                    };

                    if (e.target.files && e.target.files[0]) {
                        var error = e.target.files[0].$error;
                        if (error) {
                            if (error === "pattern") {
                                tools.infoDialog(
                                    "Wrong file format!",
                                    self.importClickEvent
                                );
                            }
                        } else {
                            reader.readAsText(e.target.files[0]);
                        }
                    }
                },
                exportStatus: undefined,
                exportPosts: function(e) {
                    var self = this;
                    self.exportStatus = true;
                    self.apiService
                        .exportPosts(self.postType)
                        .then(function(response) {
                            self.exportStatus = false;
                            var file = document.createElement("a");
                            file.setAttribute("href", response.data);
                            file.setAttribute("download", "");
                            file.click();
                        })
                        .catch(function(error) {
                            self.exportStatus = false;
                            tools.infoDialog("There was erorr exporting", e);
                        });
                },
                removeDialog: function(ev, model) {
                    var confirm = $mdDialog
                        .confirm()
                        .title(
                            "Are you sure you want to delete " +
                                model.title +
                                "?"
                        )
                        .ariaLabel("Remove dialog")
                        .clickOutsideToClose(true)
                        .targetEvent(ev)
                        .ok("Yes")
                        .cancel("No");
                    var self = this;
                    $mdDialog.show(confirm).then(
                        function() {
                            self.remove(model, ev);
                        },
                        function() {}
                    );
                }
            };

            if (listing.type === "posts") {
                listing.title = model.data.pluralTitle;
                listing.postType = model.data.type;
                listing.postTypeId = model.data.id;
                listing.postEdit =
                    listing.type + "Edit({id:model.id, type:model.type})";
            } else {
                listing.title = $state.current.title;
                listing.postEdit = listing.type + "Edit({id:model.id})";
            }
            listing.sort = createSort(listing, model.data.fields);
            listing.filters = createFilters(model.data);
            listing.resetFilters = resetFilters;
            listing.count = listing.models.length;

            return listing;
        }

        return {
            create: createListing
        };
    }
})();
