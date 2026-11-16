import { parseOptions } from './parse-options';

/** A colour as the "color" field stores it: "#rrggbb". */
export const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * A colour as typed, made "#rrggbb": trimmed, "#" added, "#abc" expanded, lower case.
 * An empty value is null; anything else that is not a colour is returned as typed, so
 * the field shows its error instead of losing the text.
 */
export function normalizeColor(raw: unknown): string | null {
    if (raw == null) {
        return null;
    }
    const value = String(raw).trim();
    if (!value) {
        return null;
    }
    let hex = value.startsWith('#') ? value.slice(1) : value;
    if (/^[0-9a-f]{3}$/i.test(hex)) {
        hex = hex.replace(/./g, (c) => c + c);
    }
    return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : value;
}

/** The palette of a "color" field: its valid colours, normalised, without duplicates. */
export function parsePalette(raw?: string | null): string[] {
    const colors = parseOptions(raw)
        .map(normalizeColor)
        .filter((c): c is string => c != null && COLOR_PATTERN.test(c));
    return Array.from(new Set(colors));
}
