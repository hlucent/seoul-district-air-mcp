// 공개 무인증 서버(/mcp) 보호용 3단계 rate limit. IP 기준, 메모리 내 상태.
// 임계값은 CLAUDE.md "Rate limit 미들웨어" 절에 고정값으로 명시되어 있다 (3/5/30).
const PER_MINUTE_WINDOW_MS = 60_000;
const PER_MINUTE_LIMIT = 3;

const BLOCK_WATCH_WINDOW_MS = 60 * 60_000; // 1시간
const BLOCK_THRESHOLD = 5; // 이 기간 내 429를 5회 이상 받으면 차단
const BLOCK_DURATION_MS = 24 * 60 * 60_000; // 24시간 차단

const DAILY_WINDOW_MS = 24 * 60 * 60_000; // 24시간 rolling
const DAILY_LIMIT = 30;

interface IpState {
  minuteHits: number[]; // 최근 60초 내 요청 시각
  dailyHits: number[]; // 최근 24시간 내 요청 시각
  rejections: number[]; // 최근 1시간 내 429를 받은 시각
  blockedUntil: number | null; // 24시간 차단 만료 시각
}

const ipStates = new Map<string, IpState>();

function getState(ip: string): IpState {
  let state = ipStates.get(ip);
  if (!state) {
    state = { minuteHits: [], dailyHits: [], rejections: [], blockedUntil: null };
    ipStates.set(ip, state);
  }
  return state;
}

export type RateLimitReason = "blocked" | "per_minute" | "daily";

export interface RateLimitResult {
  allowed: boolean;
  reason?: RateLimitReason;
}

// 요청 1건마다 정확히 한 번만 호출한다. 허용/거절 여부와 무관하게
// 카운터 갱신(및 거절 시 차단 판단)까지 이 함수 안에서 끝낸다.
export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const state = getState(ip);

  // 1) 이미 24시간 차단 중인가
  if (state.blockedUntil !== null) {
    if (now < state.blockedUntil) {
      recordRejection(state, now);
      return { allowed: false, reason: "blocked" };
    }
    state.blockedUntil = null;
    state.rejections = [];
  }

  // 2) 분당 3회 제한
  state.minuteHits = state.minuteHits.filter((t) => now - t < PER_MINUTE_WINDOW_MS);
  if (state.minuteHits.length >= PER_MINUTE_LIMIT) {
    recordRejection(state, now);
    maybeBlock(state, now);
    return { allowed: false, reason: "per_minute" };
  }

  // 3) 24시간 rolling 총 30회 제한
  state.dailyHits = state.dailyHits.filter((t) => now - t < DAILY_WINDOW_MS);
  if (state.dailyHits.length >= DAILY_LIMIT) {
    recordRejection(state, now);
    maybeBlock(state, now);
    return { allowed: false, reason: "daily" };
  }

  state.minuteHits.push(now);
  state.dailyHits.push(now);
  return { allowed: true };
}

function recordRejection(state: IpState, now: number): void {
  state.rejections = state.rejections.filter((t) => now - t < BLOCK_WATCH_WINDOW_MS);
  state.rejections.push(now);
}

function maybeBlock(state: IpState, now: number): void {
  if (state.rejections.length >= BLOCK_THRESHOLD) {
    state.blockedUntil = now + BLOCK_DURATION_MS;
  }
}
