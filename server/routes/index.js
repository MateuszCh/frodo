const postTypeRoutes = require('./postType.routes'),
    postRoutes = require('./post.routes'),
    componentRoutes = require('./component.routes'),
    pageRoutes = require('./page.routes'),
    fileRoutes = require('./file.routes'),
    userRoutes = require('./user.routes'),
    { bumpContentVersion } = require('../content-version');

// Writes to what the public site reads (pages, posts, files – imports included). Post types
// count too: deleting one deletes its posts, and editing one rewrites "type" in its posts,
// which the site selects posts by.
const WRITE_METHODS = ['PUT', 'POST', 'DELETE'];
const SITE_CONTENT_PATH = /^\/api\/(page|post|postType|file|import(Pages|Posts|PostTypes|Files))\b/;

module.exports = (app) => {
    app.put(['*'], isAuthenticated);
    app.post(['*'], isAuthenticated);
    app.delete(['*'], isAuthenticated);

    app.use(notifyOnContentChange);

    postTypeRoutes(app);
    postRoutes(app);
    componentRoutes(app);
    pageRoutes(app);
    fileRoutes(app);
    userRoutes(app);
};

// Only successful writes – a rejected save (422) changed nothing on the site.
function notifyOnContentChange(req, res, next) {
    if (WRITE_METHODS.includes(req.method) && SITE_CONTENT_PATH.test(req.path)) {
        res.on('finish', () => {
            if (res.statusCode < 400) bumpContentVersion();
        });
    }
    next();
}

function isAuthenticated(req, res, next) {
    if (req.user || req.path === '/user/login' || req.path === '/login') {
        next();
    } else {
        res.status(401).send({ error: 'User not authenticated' });
    }
}
