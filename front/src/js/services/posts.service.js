(function() {
    angular.module("frodo").service("postsService", [
        "requestService",
        function(requestService) {
            function create(data) {
                return requestService.send("/api/post", "POST", data);
            }

            function importPosts(data) {
                return requestService.send("/api/importPosts", "POST", data);
            }

            function exportPosts(postType) {
                return requestService.send(
                    "/api/exportPosts/" + postType,
                    "GET"
                );
            }

            function edit(data) {
                return requestService.send("/api/post/edit", "PUT", data);
            }

            function getById(id) {
                return requestService.send("/api/post/" + id, "GET");
            }

            function remove(id) {
                return requestService.send("/api/post/" + id, "DELETE");
            }

            return {
                create: create,
                importPosts: importPosts,
                exportPosts: exportPosts,
                edit: edit,
                getById: getById,
                remove: remove
            };
        }
    ]);
})();
