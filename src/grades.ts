// 환경부 통합대기환경지수(CAI) 항목별 등급 기준표 (상수 고정).
// 출처: 한국환경공단 에어코리아 CAI 산정 기준. API가 개별 항목 등급을 제공하지 않아
// 여기 상수 기준으로 직접 계산한다 (CLAUDE.md 우선순위 2안).
export type Grade = "좋음" | "보통" | "나쁨" | "매우나쁨";

interface Breakpoints {
  good: number; // 이 값 이하: 좋음
  moderate: number; // 이 값 이하: 보통
  bad: number; // 이 값 이하: 나쁨, 초과: 매우나쁨
}

const BREAKPOINTS = {
  PM10: { good: 30, moderate: 80, bad: 150 }, // µg/m3, 24h
  PM25: { good: 15, moderate: 35, bad: 75 }, // µg/m3, 24h
  O3: { good: 0.03, moderate: 0.09, bad: 0.15 }, // ppm, 1h
  NO2: { good: 0.03, moderate: 0.06, bad: 0.2 }, // ppm, 1h
  CO: { good: 2.0, moderate: 9.0, bad: 15.0 }, // ppm, 1h
  SO2: { good: 0.02, moderate: 0.05, bad: 0.15 }, // ppm, 1h
} as const satisfies Record<string, Breakpoints>;

export type Pollutant = keyof typeof BREAKPOINTS;

export function gradeOf(pollutant: Pollutant, value: number | null): Grade | null {
  if (value === null || Number.isNaN(value)) return null;
  const bp = BREAKPOINTS[pollutant];
  if (value <= bp.good) return "좋음";
  if (value <= bp.moderate) return "보통";
  if (value <= bp.bad) return "나쁨";
  return "매우나쁨";
}
