/** 日付文字列を表示用にフォーマット (MM/DD) */
export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}/${Number(day)}`;
}
