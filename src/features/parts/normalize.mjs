/** @param {string} value */
export function normalizePartText(value) {
 return value.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
