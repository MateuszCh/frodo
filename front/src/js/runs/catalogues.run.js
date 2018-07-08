(function() {
    angular.module("frodo").run([
        "filesService",
        function(filesService) {
            filesService.getCatalogues().then(function(response) {
                filesService.setCatalogues(response.data);
            });
        }
    ]);
})();
