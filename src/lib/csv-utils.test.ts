import { describe, it, expect } from "vitest";
import { parseCsvRows } from "./csv-utils";

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
