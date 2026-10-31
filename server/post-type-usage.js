const PostType = require('./models/postType'),
    Component = require('./models/component'),
    Settings = require('./models/settings');

// A "post" field stores the key of the post type its posts come from (field.postType). The key
// is the link: a post type that such fields use cannot be removed or get a new key.

/** Whether `fields`, or the fields of their repeater rows at any depth, pick posts of `key`. */
function usesPostType(fields, key) {
    return (fields || []).some(
        (field) =>
            (field.type === 'post' && field.postType === key) ||
            usesPostType(field.repeaterFields, key),
    );
}

/**
 * Titles of the post types, components and page types with a "post" field of the post type
 * `key`; the post type with the _id `except` (the one edited or removed) is left out.
 */
function postTypeUsage(key, except) {
    return Promise.all([
        PostType.find({}, 'title fields'),
        Component.find({}, 'title fields'),
        Settings.findSettings(),
    ]).then(([postTypes, components, settings]) =>
        [
            ...postTypes.filter((postType) => !(except && postType._id.equals(except))),
            ...components,
            ...settings.pageTypes,
        ]
            .filter((schema) => usesPostType(schema.fields, key))
            .map((schema) => schema.title),
    );
}

function postTypeInUseError(key, titles) {
    return `Post type "${key}" is used by "post" fields in: ${titles.join(', ')}`;
}

module.exports = { usesPostType, postTypeUsage, postTypeInUseError };
