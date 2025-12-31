export function formatId(value: string) {
  return value.trim();
}

export function decodeId(value: string) {
  return decodeURIComponent(value);
}
