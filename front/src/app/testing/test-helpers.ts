import { of } from 'rxjs';
import type { Field, FieldType, Post, PostType } from '../models/models';

let _seq = 1;

export function makePost(overrides: Partial<Post> = {}): Post {
    const n = _seq++;
    return {
        _id: `oid${n}`,
        id: n,
        title: `Post ${n}`,
        type: 'test',
        data: {},
        created: 1_000_000 + n,
        ...overrides,
    };
}

export function makeField(type: FieldType, id: string, title: string, extras: Partial<Field> = {}): Field {
    return { type, id, title, ...extras };
}

export function makePostType(overrides: Partial<PostType> = {}): PostType {
    return {
        _id: 'pt1',
        id: 1,
        title: 'Test Type',
        pluralTitle: 'Test Types',
        type: 'test',
        fields: [],
        posts: [],
        ...overrides,
    };
}

export function makeDialogRef(returnValue: boolean | undefined = true) {
    return { afterClosed: vi.fn().mockReturnValue(of(returnValue)) };
}
