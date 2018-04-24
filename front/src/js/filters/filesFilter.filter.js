(function(){
    angular.module('frodo').filter('filesFilter', FilesFilter);

    FilesFilter.$inject = ['$filter', '$rootScope'];

    function FilesFilter($filter, $rootScope){

        return function(files, filters){
            if(!files.length){
                return files;
            }

            // textFilter
            files = $filter('filter')(files, filters.text);

            if(filters.catalogues.length){
                files = files.filter(function(file){
                    return filters.catalogues.indexOf(file.catalogue) > -1;
                })
            }

            var index = undefined;
            if(files[0]) index = files[0].localId;

            $rootScope.$broadcast('filesFiltered', index, files.length);

            return files
        }

    }

})();