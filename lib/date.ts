/**
 * 날짜 유틸.
 *
 * 이 앱은 한국 딜러 현장에서 쓰이지만 서버는 UTC로 도는 경우가 많다(Vercel 등).
 * 그냥 new Date().toISOString()을 쓰면 한국 시각 00~09시 사이에 날짜가 하루 전으로
 * 밀리기 때문에, 날짜만 다루는 값은 반드시 여기 있는 함수를 거친다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayInKst(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * YYYY-MM-DD에 일수를 더한다.
 * UTC 자정으로 고정해 계산하므로 서버 타임존에 영향을 받지 않는다.
 */
export function addDays(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
