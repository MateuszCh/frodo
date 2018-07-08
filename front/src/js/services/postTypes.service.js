(function() {
    angular.module("frodo").service("postTypesService", [
        "requestService",
        function(requestService) {
            function create(data) {
                return requestService.send("/api/postType", "POST", data);
            }

            function edit(data) {
                return requestService.send("/api/postType/edit", "PUT", data);
            }

            function getAll() {
                return requestService.send("/api/postType", "GET");
            }

            function getById(id) {
                return requestService.send("/api/postType/" + id, "GET");
            }

            function getByIdWithPosts(id) {
                return requestService.send("/api/postTypePosts/" + id, "GET");
            }

            function getByType(type) {
                return requestService.send(
                    "/api/postTypeByType/" + type,
                    "GET"
                );
            }

            function getByTypeWithPosts(type) {
                return requestService.send(
                    "/api/postTypeByTypePosts/" + type,
                    "GET"
                );
            }

            function remove(id) {
                return requestService.send("/api/postType/" + id, "DELETE");
            }

            function exportPosts() {
                return requestService.send("/api/exportPostTypes", "GET");
            }

            function importPosts(data) {
                return requestService.send(
                    "/api/importPostTypes",
                    "POST",
                    data
                );
            }

            return {
                create: create,
                edit: edit,
                getAll: getAll,
                getById: getById,
                getByIdWithPosts: getByIdWithPosts,
                getByType: getByType,
                getByTypeWithPosts: getByTypeWithPosts,
                remove: remove,
                exportPosts: exportPosts,
                importPosts: importPosts
            };
        }
    ]);
})();
