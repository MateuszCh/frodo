import { ComponentEntity, PageComponent } from '../models/models';

/**
 * The value stored for a chosen component: a page row and a "component" field share this
 * shape, so the public site can render both the same way.
 */
export function componentValue(component: ComponentEntity): PageComponent {
    return { type: component.type, title: component.title, data: {} };
}
