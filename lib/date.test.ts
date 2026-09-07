import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, todayInKst } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayInKst", () => {
  it("한국 낮 시간에는 UTC 날짜와 같다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T03:00:00Z")); // 한국 12:00
    expect(todayInKst()).toBe("2026-09-07");
  });

  it("한국 새벽(UTC 전날 밤)에도 한국 날짜를 돌려준다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z")); // 한국 09-07 05:00
    expect(todayInKst()).toBe("2026-09-07");
  });

  it("한국 자정 직후 경계에서 날짜가 넘어간다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T14:59:59Z")); // 한국 09-06 23:59:59
    expect(todayInKst()).toBe("2026-09-06");

    vi.setSystemTime(new Date("2026-09-06T15:00:00Z")); // 한국 09-07 00:00:00
    expect(todayInKst()).toBe("2026-09-07");
  });
});

describe("addDays", () => {
  it("일수를 더한다", () => {
    expect(addDays("2026-09-07", 7)).toBe("2026-09-14");
  });

  it("월말을 넘어간다", () => {
    expect(addDays("2026-08-25", 10)).toBe("2026-09-04");
  });

  it("윤년 2월을 처리한다", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-28", 2)).toBe("2028-03-01");
  });

  it("연말을 넘어간다", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("0일을 더하면 그대로다", () => {
    expect(addDays("2026-09-07", 0)).toBe("2026-09-07");
  });

  it("음수도 처리한다", () => {
    expect(addDays("2026-09-07", -7)).toBe("2026-08-31");
  });
});
