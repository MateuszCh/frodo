// Domain models mirroring the Mongoose schemas in server/models/*.
// `_id` is the Mongo id; `id` is the numeric auto-increment id used in URLs.

export interface Field {
    title: string;
    type: FieldType;
    id: string;
    selectOptions?: string;
    multiselectOptions?: string;
    repeaterFields?: Field[];
    /** "post" field: key of the post type its posts are chosen from */
    postType?: string;
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
    | 'component'
    // chosen posts of the post type in `postType` (PostFieldValue)
    | 'post';

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

/** Value of a "post" field: the numeric ids of the chosen posts, in the chosen order. */
export interface PostFieldValue {
    ids: number[];
}

/** Answer of an import of pages, post types, components or posts: how many were saved. */
export interface ImportResult {
    imported: number;
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

/** The period of the visit statistics: a preset length in days, or two whole days. */
export type VisitRange = { days: number } | { from: string; to: string };

export interface VisitDay {
    /** "YYYY-MM-DD", Polish time */
    day: string;
    /** visits that started with a full page load (after 30 minutes without a hit) */
    entries: number;
    /** different visitors of the day (full page loads only) */
    unique: number;
    /** full page loads: loads, reloads, new tabs */
    loads: number;
    /** pages opened inside the app, without reloading */
    nav: number;
}

export interface VisitTopRow {
    /** a referring host, a device or a language code; null: not known (no external referrer) */
    key: string | null;
    count: number;
}

export interface VisitPageRow {
    /** the page's path, as geosilesia stores it */
    key: string;
    /** the CMS page the path belongs to, when there is one */
    page?: { id: number; title: string };
    entries: number;
    /** visitors of the page, counted once a day */
    unique: number;
    loads: number;
    nav: number;
    /** loads and transitions together */
    views: number;
    /** visits that started on the page and stayed on it */
    single: number;
}

/** Visits, and those that stayed on one page. */
export interface VisitSinglePage {
    visits: number;
    single: number;
}

/** A page of a move between pages: its path, and the CMS page when there is one. */
export interface VisitPathRef {
    path: string;
    page?: { id: number; title: string };
}

export interface VisitTransition {
    from: VisitPathRef;
    to: VisitPathRef;
    count: number;
}

/** Views in one hour of one weekday (1 = Monday … 7 = Sunday), Polish time. */
export interface VisitHour {
    weekday: number;
    hour: number;
    count: number;
}

/** GET /api/analytics/visits: the statistics geosilesia collects in its `visits` collection. */
export interface VisitStats {
    from: string;
    to: string;
    days: VisitDay[];
    /** sums of the period; `unique` is the sum of daily uniques, not different people */
    totals: Omit<VisitDay, 'day'>;
    singlePage: VisitSinglePage;
    /** the period of the same length just before, to compare with */
    previous: {
        from: string;
        to: string;
        totals: Omit<VisitDay, 'day'>;
        singlePage: VisitSinglePage;
    };
    /** every page opened in the period, with all its counts */
    pages: VisitPageRow[];
    /** the most frequent moves from one page to another inside visits */
    transitions: VisitTransition[];
    hours: VisitHour[];
    referrers: VisitTopRow[];
    devices: VisitTopRow[];
    /** the browsers' first language codes of the entries; null: not known */
    languages: VisitTopRow[];
}
