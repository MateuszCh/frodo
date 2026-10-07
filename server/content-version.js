const mongoose = require('mongoose');

// Shared with the public site (geosilesia), which reads the same database.
const COLLECTION = 'meta';
const DOC_ID = 'content';

/**
 * Tells the public site (geosilesia) that what it shows changed: bumps a counter that every
 * site process polls, so each of them drops its cached pages and server-rendered HTML
 * instead of waiting for the cache TTL. Fire-and-forget: a failure is only logged and never
 * affects the CMS response.
 */
function bumpContentVersion() {
    mongoose.connection.db
        .collection(COLLECTION)
        .updateOne({ _id: DOC_ID }, { $inc: { version: 1 } }, { upsert: true })
        .catch((err) => console.log(new Date(), '[content-version] bump failed:', err.message));
}

module.exports = { bumpContentVersion };
