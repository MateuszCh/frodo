(function(){
    angular.module('frodo').service('pagesService', ['requestService', function(requestService){

        function create(data){
            return requestService.send('/api/page', 'POST', data);
        }

        function edit(data){
            return requestService.send('/api/page/edit', 'PUT', data);
        }

        function getAll(){
            return requestService.send('/api/page', 'GET');
        }

        function getById(id){
            return requestService.send('/api/page/' + id, 'GET');
        }

        function remove(id){
            return requestService.send('/api/page/' + id, 'DELETE');
        }

        function exportPosts(){
            return requestService.send('/api/exportPages', 'GET');
        }

        function importPosts(data){
            return requestService.send('/api/importPages', 'POST', data);
        }

        return {
            create: create,
            edit: edit,
            getAll: getAll,
            getById: getById,
            remove: remove,
            exportPosts: exportPosts,
            importPosts: importPosts
        }

    }]);
})();
