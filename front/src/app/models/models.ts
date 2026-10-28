// Domain models mirroring the Mongoose schemas in server/models/*.
// `_id` is the Mongo id; `id` is the numeric auto-increment id used in URLs.

export interface Field {
    title: string;
    type: FieldType;
    id: string;
    selectOptions?: string;
    multiselectOptions?: string;
    repeaterFields?: Field[];
    // virtuals computed server-side from select/multiselectOptions
    options?: string[] | null;
    multiOptions?: string[] | null;
}

export type FieldType =
    | 'text'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'multiselect'
    | 'repeater'
    | 'number'
    | 'file'
    | 'date'
    | 'catalogue'
    // a nested component; its value has the shape of a page row (PageComponent)
    | 'component';

/** Base shape shared by PostType and Component (postTypeAbstractSchema). */
export interface SchemaEntity {
    _id?: string;
    id?: number;
    title: string;
    type: string;
    fields: Field[];
    created?: number;
    updated?: number;
    url?: string;
}

export interface PostType extends SchemaEntity {
    pluralTitle: string;
    posts?: Post[];
}

export type ComponentEntity = SchemaEntity;

export interface Post {
    _id?: string;
    id?: number;
    title: string;
    type: string;
    data: Record<string, unknown>;
    created?: number;
    updated?: number;
    url?: string;
}

export interface Page {
    _id?: string;
    id?: number;
    title: string;
    pageUrl: string;
    seoTitle?: string;
    seoDescription?: string;
    /** key (`type`) of a page type from the settings */
    type?: string | null;
    /** values of the fields of the page type */
    typeData?: Record<string, unknown>;
    // the backend schema is `rows: [{}]` (schemaless); each row holds one
    // component instance directly
    rows: PageComponent[];
    created?: number;
    updated?: number;
    url?: string;
}

export interface PageComponent {
    type: string;
    title?: string;
    fields?: Field[];
    data?: Record<string, unknown>;
}

/** A kind of page, defined in the settings; a page stores its `type` key. */
export interface PageType {
    title: string;
    type: string;
    fields: Field[];
}

/** Site-wide configuration (one document on the server). */
export interface Settings {
    pageTypes: PageType[];
    /** sent by the server, not saved: titles of the pages of each page type key */
    usage?: Record<string, string[]>;
}

export interface FileItem {
    _id?: string;
    id?: number;
    title?: string;
    filename: string;
    src?: string;
    description?: string;
    author?: string;
    place?: string;
    type?: string;
    size?: number;
    catalogues?: string[];
    position?: number;
    created?: number;
    updated?: number;
}

export interface User {
    username?: string;
    id?: number | string;
    logged?: number;
    loaded?: number;
}
