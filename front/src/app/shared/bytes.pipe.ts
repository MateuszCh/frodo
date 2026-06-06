import { Pipe, PipeTransform } from '@angular/core';

/** Port of bytes.filter.js — human-readable file size. */
@Pipe({ name: 'bytes' })
export class BytesPipe implements PipeTransform {
    transform(bytes: number | null | undefined, precision = 1): string {
        if (bytes === 0) return '0 bytes';
        if (bytes == null || isNaN(parseFloat(String(bytes))) || !isFinite(bytes)) {
            return '-';
        }
        const units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
        const number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (
            (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number]
        );
    }
}
