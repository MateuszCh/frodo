const postTypeRoutes = require('./postType.routes'),
    postRoutes = require('./post.routes'),
    componentRoutes = require('./component.routes'),
    pageRoutes = require('./page.routes'),
    fileRoutes = require('./file.routes'),
    userRoutes = require('./user.routes'),
    settingsRoutes = require('./settings.routes'),
    listingRoutes = require('./listing.routes'),
    analyticsRoutes = require('./analytics.routes'),
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
    // every read of the CMS data too (listings, exports, settings…); /user/* stays open, the
    // login screen needs it, and so does /uploads (served apart, read by the public site)
    app.get('/api/*', isAuthenticated);

    app.use(notifyOnContentChange);

    postTypeRoutes(app);
    postRoutes(app);
    componentRoutes(app);
    pageRoutes(app);
    fileRoutes(app);
    userRoutes(app);
    settingsRoutes(app);
    listingRoutes(app);
    analyticsRoutes(app);
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
