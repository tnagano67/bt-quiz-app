import { toZonedTime } from "date-fns-tz";
import { format, subDays } from "date-fns";

const TZ = "Asia/Tokyo";

/** Asia/Tokyo での「今日」の日付文字列 (YYYY-MM-DD) */
export function getTodayJST(): string {
  const now = toZonedTime(new Date(), TZ);
  return format(now, "yyyy-MM-dd");
}

/** 直近 N 日分の日付文字列配列（新しい順） */
export function getRecentDates(days: number): string[] {
  const now = toZonedTime(new Date(), TZ);
  return Array.from({ length: days }, (_, i) =>
    format(subDays(now, i), "yyyy-MM-dd")
  );
}

/** 日付文字列を表示用にフォーマット (MM/DD) */
export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 本日受験済みかどうか */
export function isTakenToday(lastChallengeDate: string | null): boolean {
  if (!lastChallengeDate) return false;
  return lastChallengeDate === getTodayJST();
}
