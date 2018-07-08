const PostController = require("../controllers/post.controller");

module.exports = app => {
    app.post("/api/post", PostController.create);

    app.post("/api/importPosts", PostController.importPosts);

    app.get("/api/exportPosts/:postType", PostController.exportPosts);

    app.put("/api/post/edit", PostController.edit);

    app.get("/api/post/:id", PostController.getById);

    app.delete("/api/post/:id", PostController.delete);
};
