/** Parse a semicolon-separated options string into a unique list (server virtual). */
export function parseOptions(raw?: string | null): string[] {
    if (!raw) {
        return [];
    }
    const parts = raw
        .replace(/\s*;\s*/g, ';')
        .split(';')
        .filter(Boolean)
        .map((o) => o.replace(/;/g, ''));
    return Array.from(new Set(parts));
}
