/** CSV テキスト全体をパースし、複数行フィールド（クォート内の改行）に対応 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else if (ch === "\r") {
        // skip \r, handle \n next
      } else if (ch === "\n") {
        fields.push(current);
        current = "";
        if (fields.some((f) => f.trim() !== "") || fields.length > 1) {
          rows.push(fields);
        }
        fields = [];
      } else {
        current += ch;
      }
    }
  }
  // 最終行（改行なしで終わる場合）
  fields.push(current);
  if (fields.some((f) => f.trim() !== "") || fields.length > 1) {
    rows.push(fields);
  }

  return rows;
}
