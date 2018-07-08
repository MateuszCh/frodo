const postTypeRoutes = require("./postType.routes"),
    postRoutes = require("./post.routes"),
    componentRoutes = require("./component.routes"),
    pageRoutes = require("./page.routes"),
    fileRoutes = require("./file.routes"),
    userRoutes = require("./user.routes");

module.exports = app => {
    app.put(["*"], isAuthenticated);
    app.post(["*"], isAuthenticated);
    app.delete(["*"], isAuthenticated);

    postTypeRoutes(app);
    postRoutes(app);
    componentRoutes(app);
    pageRoutes(app);
    fileRoutes(app);
    userRoutes(app);
};

function isAuthenticated(req, res, next) {
    if (req.user || req.path === "/user/login" || req.path === "/login") {
        next();
    } else {
        res.status(401).send({ error: "User not authenticated" });
    }
}
