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
    | 'catalogue';

/** Base shape shared by PostType and Component (postTypeAbstractSchema). */
export interface SchemaEntity {
    _id?: string;
    id?: number;
    title: string;
    type: string;
    fields: Field[];
    created?: number;
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
    url?: string;
}

export interface Page {
    _id?: string;
    id?: number;
    title: string;
    pageUrl: string;
    // the backend schema is `rows: [{}]` (schemaless); each row holds one
    // component instance directly
    rows: PageComponent[];
    created?: number;
    url?: string;
}

export interface PageComponent {
    type: string;
    title?: string;
    fields?: Field[];
    data?: Record<string, unknown>;
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
}

export interface User {
    username?: string;
    id?: number | string;
    logged?: number;
    loaded?: number;
}
