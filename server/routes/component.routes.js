const PostTypeController = require("../controllers/postType.controller");

module.exports = app => {
    app.post("/api/component", PostTypeController.create);

    app.put("/api/component/edit", PostTypeController.edit);

    app.get("/api/component", PostTypeController.getAll);

    app.get("/api/component/:id", PostTypeController.getById);

    app.delete("/api/component/:id", PostTypeController.delete);

    app.get("/api/exportComponents", PostTypeController.exportPostTypes);

    app.post("/api/importComponents", PostTypeController.importPostTypes);
};
