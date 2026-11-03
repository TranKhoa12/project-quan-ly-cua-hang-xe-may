/** Capitalize word initials without changing acronyms, spacing, or model numbers. */
export function capitalizeWords(value:string):string {
 return value.replace(/(^|[^\p{L}\p{M}\p{N}])(\p{L})/gu,(_,prefix:string,letter:string)=>prefix+letter.toLocaleUpperCase('vi-VN'));
}
