import { FieldType } from './models';

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
};

export const FIELD_LIST: FieldTypeDef[] = Object.values(FIELDS);
