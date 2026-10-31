import { InjectionToken, Signal } from '@angular/core';

/**
 * The post open in the post editor, for the fields inside it: a "post" field does not offer
 * the post it is part of. Not provided in the other editors.
 */
export interface EditedPost {
    /** numeric id of the post; undefined for a new one */
    readonly postId: Signal<number | undefined>;
}

export const EDITED_POST = new InjectionToken<EditedPost>('EDITED_POST');
