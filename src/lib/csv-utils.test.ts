import { describe, it, expect } from "vitest";
import { parseCsvRows, generateCsvText } from "./csv-utils";

describe("parseCsvRows", () => {
  it("通常のCSV（1行）", () => {
    const result = parseCsvRows("1,テスト問題,A,B,C,D,1");
    expect(result).toEqual([["1", "テスト問題", "A", "B", "C", "D", "1"]]);
  });

  it("複数行", () => {
    const csv = "1,問題1,A,B,C,D,1\n2,問題2,E,F,G,H,2";
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(2);
    expect(result[0][1]).toBe("問題1");
    expect(result[1][1]).toBe("問題2");
  });

  it("末尾に改行がある場合も正しくパースされる", () => {
    const csv = "1,問題1,A,B,C,D,1\n";
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["1", "問題1", "A", "B", "C", "D", "1"]);
  });

  it("Windows改行（CRLF）", () => {
    const csv = "1,問題1,A,B,C,D,1\r\n2,問題2,E,F,G,H,2\r\n";
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(["1", "問題1", "A", "B", "C", "D", "1"]);
    expect(result[1]).toEqual(["2", "問題2", "E", "F", "G", "H", "2"]);
  });

  it("クォートで囲まれたフィールド", () => {
    const csv = '1,"問題文です",A,B,C,D,1';
    const result = parseCsvRows(csv);
    expect(result[0][1]).toBe("問題文です");
  });

  it("クォート内の改行（複数行フィールド）", () => {
    const csv = '1,"複数行\nの問題文",A,B,C,D,1';
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe("複数行\nの問題文");
  });

  it("クォート内のカンマ", () => {
    const csv = '1,"A, B, C という選択肢",A,B,C,D,1';
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe("A, B, C という選択肢");
  });

  it('エスケープされたクォート（""）', () => {
    const csv = '1,"選択肢に""クォート""が含まれる",A,B,C,D,1';
    const result = parseCsvRows(csv);
    expect(result[0][1]).toBe('選択肢に"クォート"が含まれる');
  });

  it("空行はスキップされる", () => {
    const csv = "1,問題1,A,B,C,D,1\n\n2,問題2,E,F,G,H,2";
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(2);
  });

  it("空文字列 → 空配列", () => {
    const result = parseCsvRows("");
    expect(result).toEqual([]);
  });

  it("クォート内のCRLF", () => {
    const csv = '1,"複数行\r\nの問題文",A,B,C,D,1';
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(1);
    expect(result[0][1]).toBe("複数行\r\nの問題文");
  });

  it("複数フィールドがクォートで囲まれている場合", () => {
    const csv = '"1","問題文","選択肢A","選択肢B","選択肢C","選択肢D","1"';
    const result = parseCsvRows(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      "1",
      "問題文",
      "選択肢A",
      "選択肢B",
      "選択肢C",
      "選択肢D",
      "1",
    ]);
  });
});

describe("generateCsvText", () => {
  it("通常の2D配列をCSVに変換", () => {
    const result = generateCsvText([
      ["名前", "年齢", "組"],
      ["田中", "15", "A"],
    ]);
    expect(result).toBe("名前,年齢,組\r\n田中,15,A");
  });

  it("カンマを含むフィールドをクォートで囲む", () => {
    const result = generateCsvText([["A, B", "C"]]);
    expect(result).toBe('"A, B",C');
  });

  it("ダブルクォートをエスケープ", () => {
    const result = generateCsvText([['引用"テスト"です']]);
    expect(result).toBe('"引用""テスト""です"');
  });

  it("改行を含むフィールドをクォートで囲む", () => {
    const result = generateCsvText([["行1\n行2", "OK"]]);
    expect(result).toBe('"行1\n行2",OK');
  });

  it("null/undefined は空文字として扱う", () => {
    const result = generateCsvText([[null, undefined, "値"]]);
    expect(result).toBe(",,値");
  });

  it("数値・真偽値を文字列に変換", () => {
    const result = generateCsvText([[1, true, false, 3.14]]);
    expect(result).toBe("1,true,false,3.14");
  });

  it("空の配列 → 空文字列", () => {
    expect(generateCsvText([])).toBe("");
  });
});
