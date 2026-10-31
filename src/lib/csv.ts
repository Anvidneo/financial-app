function escapeCell(value: string | number): string {
  const text = value.toString();
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}
