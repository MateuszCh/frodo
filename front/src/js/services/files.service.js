(function() {
    angular.module("frodo").service("filesService", [
        "requestService",
        "Upload",
        function(requestService, Upload) {
            var _catalogues;

            function getAllFiles() {
                return requestService.send("/api/file", "GET");
            }

            function getCatalogues() {
                if (_catalogues) {
                    return _catalogues;
                } else {
                    return requestService.send("/api/file/catalogues", "GET");
                }
            }

            function setCatalogues(catalogues) {
                _catalogues = catalogues;
            }

            function getByCatalogue(catalogue) {
                return requestService.send("/api/file/" + catalogue, "GET");
            }

            function remove(id) {
                return requestService.send("/api/file/" + id, "DELETE");
            }

            function edit(data) {
                return requestService.send("/api/file", "PUT", data);
            }

            function exportFiles() {
                return requestService.send("/api/exportFiles", "GET");
            }

            function importFiles(data) {
                return requestService.send("/api/importFiles", "POST", data);
            }

            function upload(files, filesData) {
                return Upload.upload({
                    url: "/api/file",
                    data: {
                        files: files,
                        filesData: filesData
                    },
                    arrayKey: ""
                });
            }

            return {
                getAllFiles: getAllFiles,
                getCatalogues: getCatalogues,
                setCatalogues: setCatalogues,
                getByCatalogue: getByCatalogue,
                upload: upload,
                edit: edit,
                remove: remove,
                exportFiles: exportFiles,
                importFiles: importFiles
            };
        }
    ]);
})();
