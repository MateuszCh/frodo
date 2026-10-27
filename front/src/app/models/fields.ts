import { Field, FieldType } from './models';

export interface FieldTypeDef {
    name: string;
    type: FieldType;
}

// Port of fields.constant.js — property name and `type` must match.
export const FIELDS: Record<FieldType, FieldTypeDef> = {
    text: { name: 'Text', type: 'text' },
    textarea: { name: 'Textarea', type: 'textarea' },
    checkbox: { name: 'True/False', type: 'checkbox' },
    select: { name: 'Select', type: 'select' },
    multiselect: { name: 'Multiselect', type: 'multiselect' },
    repeater: { name: 'Repeater', type: 'repeater' },
    number: { name: 'Number', type: 'number' },
    file: { name: 'File', type: 'file' },
    date: { name: 'Date', type: 'date' },
    catalogue: { name: 'Catalogue', type: 'catalogue' },
    component: { name: 'Component', type: 'component' },
};

export const FIELD_LIST: FieldTypeDef[] = Object.values(FIELDS);

/** A new field definition, as every field editor adds it. */
export function blankField(): Field {
    return {
        type: 'text',
        title: '',
        id: '',
        selectOptions: undefined,
        multiselectOptions: undefined,
        repeaterFields: [],
    };
}

/** Field ids and type keys as typed: spaces become underscores, letters lower case (server: formatId). */
export function formatKey(value: string): string {
    return value.replace(/\s+/g, '_').toLowerCase();
}
