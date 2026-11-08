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
    /** hidden from the public site, which answers 404 for it */
    draft?: boolean;
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

/** A preset (analytics-prefs.ts: today, 7, 30, 90 days, year to date) or two whole days. */
export type VisitRange = { period: 'today' | '7' | '30' | '90' | 'ytd' } | { from: string; to: string };

export interface VisitDay {
    /** "YYYY-MM-DD", Polish time */
    day: string;
    /** different visitors of the day */
    visitors: number;
    /** visits that started on the day: one visitor's views without a 30-minute gap */
    visits: number;
    /** pages opened: full loads, reloads and moves inside the site */
    views: number;
}

/** One hour (0–23, Polish time) of a one-day period; its visitors are those of the hour. */
export interface VisitHourRow extends Omit<VisitDay, 'day'> {
    hour: number;
}

/** Sums of a period; `visitors` is the sum of daily visitors, not different people. */
export interface VisitTotals extends Omit<VisitDay, 'day'> {
    /** the average visit in seconds, from its first view to its last */
    duration: number;
    /** the average visible time of a page in seconds; null before the site sent any */
    engagement: number | null;
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
    views: number;
    /** visitors of the page, counted once a day */
    visitors: number;
    /** visits that started on the page */
    entries: number;
    /** of those, the visits that stayed on it */
    single: number;
    /** visits that ended on the page */
    exits: number;
    /** the average visible time of the page in seconds; null before the site sent any */
    engagement: number | null;
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
    totals: VisitTotals;
    /** a period of one day only: its hours, up to the current one today */
    hourly?: VisitHourRow[];
    singlePage: VisitSinglePage;
    /** the period of the same length just before, to compare with */
    previous: {
        from: string;
        to: string;
        totals: VisitTotals;
        singlePage: VisitSinglePage;
    };
    /** every page opened in the period, with all its counts */
    pages: VisitPageRow[];
    /** the most frequent moves from one page to another inside visits */
    transitions: VisitTransition[];
    hours: VisitHour[];
    referrers: VisitTopRow[];
    devices: VisitTopRow[];
    /** the browsers' first language codes of the visits; null: not known */
    languages: VisitTopRow[];
    /** browser families ("chrome") and system families ("ios") of the visits */
    browsers: VisitTopRow[];
    systems: VisitTopRow[];
    /** visits by the different pages they opened ("1", "2", "3-5", "6+") */
    depth: VisitBucket[];
    /** visits by their length in seconds ("0-10", "10-30", "30-180", "180+") */
    lengths: VisitBucket[];
    /** addresses that do not exist, with where the visitors came from */
    notFound: VisitNotFound[];
    /** clicked links to other sites ("host/path") and to documents ("/uploads/x.pdf") */
    outbound: VisitTopRow[];
    downloads: VisitTopRow[];
}

export interface VisitBucket {
    key: string;
    count: number;
}

export interface VisitNotFound {
    /** the address, as a normalised path */
    key: string;
    count: number;
    /** a page of the site with a broken link, another site's host, or null: not known */
    sources: { key: string | null; count: number }[];
}

/** GET /api/analytics/live: visitors with a page view in the last `minutes`. */
export interface VisitLive {
    minutes: number;
    visitors: number;
    /** each visitor on the last page they opened */
    pages: { key: string; count: number; page?: { id: number; title: string } }[];
}
