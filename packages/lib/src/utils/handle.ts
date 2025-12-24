export function formatHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^A-Za-z0-9]/g, '-');
}
