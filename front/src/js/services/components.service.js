(function() {
    angular.module("frodo").service("componentsService", [
        "requestService",
        function(requestService) {
            function create(data) {
                return requestService.send("/api/component", "POST", data);
            }

            function edit(data) {
                return requestService.send("/api/component/edit", "PUT", data);
            }

            function getAll() {
                return requestService.send("/api/component", "GET");
            }

            function getById(id) {
                return requestService.send("/api/component/" + id, "GET");
            }

            function remove(id) {
                return requestService.send("/api/component/" + id, "DELETE");
            }

            function exportPosts() {
                return requestService.send("/api/exportComponents", "GET");
            }

            function importPosts(data) {
                return requestService.send(
                    "/api/importComponents",
                    "POST",
                    data
                );
            }

            return {
                create: create,
                edit: edit,
                getAll: getAll,
                getById: getById,
                remove: remove,
                exportPosts: exportPosts,
                importPosts: importPosts
            };
        }
    ]);
})();
