(function() {
    angular.module("frodo").constant("statePromises", {
        // get all pages
        pages: [
            "pagesService",
            function(pagesService) {
                return pagesService.getAll();
            }
        ],
        // get page by id
        page: [
            "pagesService",
            "$transition$",
            function(pagesService, $transition$) {
                return pagesService.getById($transition$.params().id);
            }
        ],
        // get all post types
        postTypes: [
            "postTypesService",
            function(postTypesService) {
                return postTypesService.getAll();
            }
        ],
        // get post type by type
        postType: [
            "postTypesService",
            "$transition$",
            function(postTypesService, $transition$) {
                return postTypesService.getByType($transition$.params().type);
            }
        ],
        // get post type by type with posts
        postTypeWithPosts: [
            "postTypesService",
            "$transition$",
            function(postTypesService, $transition$) {
                return postTypesService.getByTypeWithPosts(
                    $transition$.params().type
                );
            }
        ],
        // get post type by id
        postTypeById: [
            "postTypesService",
            "$transition$",
            function(postTypesService, $transition$) {
                return postTypesService.getById($transition$.params().id);
            }
        ],
        // get post by id
        post: [
            "postsService",
            "$transition$",
            function(postsService, $transition$) {
                return postsService.getById($transition$.params().id);
            }
        ],
        // get all components
        components: [
            "componentsService",
            function(componentsService) {
                return componentsService.getAll();
            }
        ],
        // get component by id
        component: [
            "componentsService",
            "$transition$",
            function(componentsService, $transition$) {
                return componentsService.getById($transition$.params().id);
            }
        ],
        // get all files
        files: [
            "filesService",
            function(filesService) {
                return filesService.getAllFiles();
            }
        ],
        exist: [
            "userService",
            function(userService) {
                return userService.exist();
            }
        ],
        user: [
            "userService",
            function(userService) {
                return userService.user();
            }
        ]
    });
})();
