const format = require('./models/tools/format');

// Rules shared by the page and settings controllers: what a page may store as its type and
// type values, which pages use which type, and a queue for their check-and-write steps.

function unknownPageTypeError(key) {
    return `There is no "${key}" page type`;
}

/**
 * The `type` and `typeData` a page is saved with. A page without a type keeps no type
 * values; otherwise the key has to be a page type from the settings, and only the values
 * of that type's fields are kept. Returns { error } for a key the settings do not have.
 */
function pageTypeProps(page, pageTypes) {
    if (!page.type) {
        return { type: undefined, typeData: {} };
    }
    const pageType = pageTypes.find((candidate) => candidate.type === page.type);
    if (!pageType) {
        return { error: unknownPageTypeError(page.type) };
    }
    const values = page.typeData && typeof page.typeData === 'object' ? page.typeData : {};
    const typeData = {};
    pageType.fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(values, field.id)) {
            typeData[field.id] = values[field.id];
        }
    });
    return { type: page.type, typeData };
}

/**
 * Page types from a settings request, with their keys formatted as the editor does. Every
 * other value is kept – the schema drops what it does not know – so an imported page type
 * loses nothing a newer schema field holds.
 */
function normalizePageTypes(pageTypes) {
    return pageTypes.map((pageType) => {
        const { type, fields } = pageType || {};
        return {
            ...pageType,
            type: typeof type === 'string' ? format.formatId(type) : type,
            fields: fields || [],
        };
    });
}

/** Titles of the pages that use each page type: { key: [title, …] }. */
function pagesByType(pages) {
    // no prototype: a key such as "constructor" must not hit Object.prototype
    const usage = Object.create(null);
    pages.forEach((page) => {
        if (page.type) {
            (usage[page.type] = usage[page.type] || []).push(page.title);
        }
    });
    return usage;
}

let queue = Promise.resolve();

/**
 * Runs `task` (a function returning a promise) after every task queued before it. A page
 * save checks its type against the settings, and a settings save checks that no page uses
 * a removed type; queued, neither can slip in between the other's check and write. This
 * holds within one process, and the CMS runs as one.
 */
function withPageTypeLock(task) {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
}

module.exports = { unknownPageTypeError, pageTypeProps, normalizePageTypes, pagesByType, withPageTypeLock };
