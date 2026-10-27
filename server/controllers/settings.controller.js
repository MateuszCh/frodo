const Settings = require('../models/settings'),
    Page = require('../models/page'),
    { normalizePageTypes, pagesByType, withPageTypeLock } = require('../page-types');

function typedPages() {
    return Page.find({ type: { $nin: [null, ''] } }, 'title type');
}

// The editor needs the pages that use each type: it keeps those types from being removed
// or getting a new key, which the save would reject.
function withUsage(settings, pages) {
    return { ...settings.toJSON(), usage: pagesByType(pages) };
}

module.exports = {
    get(req, res, next) {
        Promise.all([Settings.findSettings(), typedPages()])
            .then(([settings, pages]) => res.send(withUsage(settings, pages)))
            .catch(next);
    },
    edit(req, res, next) {
        // a missing list would save as "no page types"
        if (!Array.isArray(req.body.pageTypes)) {
            return res.status(422).send({ error: 'Page types should be a list' });
        }
        const pageTypes = normalizePageTypes(req.body.pageTypes);
        const keys = pageTypes.map((pageType) => pageType.type);

        // queued with page saves, so no page takes a type between the check and the write
        withPageTypeLock(() =>
            Promise.all([Settings.findSettings(), typedPages()]).then(([settings, pages]) => {
                const usage = pagesByType(pages);
                // pages keep the key of their type, so a key they still use cannot be removed or renamed
                const removed = Object.keys(usage).find((key) => !keys.includes(key));
                if (removed) {
                    return res.status(422).send({
                        error: `Page type "${removed}" is used by pages: ${usage[removed].join(', ')}`,
                    });
                }
                settings.pageTypes = pageTypes;
                return settings.save().then((saved) => res.send(withUsage(saved, pages)));
            }),
        ).catch(next);
    },
};
