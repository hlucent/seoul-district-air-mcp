# 개발일지

## 전체 타임라인 요약

| 시점 | 내용 |
| --- | --- |
| 2026-08-15 | 초기 설계: CLAUDE.md 작성 (단일 데이터셋 원칙, `get_district_air_quality` 도구 설계, 에러 처리/인증 방침 확정) |
| 2026-08-15 10:28 | [PR #1](https://github.com/hlucent/seoul-district-air-mcp/pull/1) 병합 — `get_district_air_quality` 최초 구현 (stdio transport) |
| 2026-08-15 11:01 | [PR #2](https://github.com/hlucent/seoul-district-air-mcp/pull/2) 병합 — stdio → Streamable HTTP 전환, `Dockerfile`/`fly.toml` 작성 |
| 2026-08-15 12:22 | [PR #3](https://github.com/hlucent/seoul-district-air-mcp/pull/3) 병합 — 공개 접근성 점검(인증 없음 확인, `ERROR-4xx` 메시지 노출 수정) |
| 2026-08-15 (세션 밖) | 사용자가 fly.io 앱 생성, `fly secrets set SEOUL_API_KEY=...` 등록, `fly deploy`로 최초 배포 완료. 실제 서비스 URL: `https://seoul-district-air-mcp.fly.dev/mcp` |
| 2026-08-15 | README/DEVLOG를 배포된 URL 기준으로 갱신, CLAUDE.md에 "완료된 작업은 즉시 DEVLOG에 기록" 원칙 추가 (본 항목) |

배포 후 `/health`, `tools/list` 실호출 검증은 사용자가 배포 직후 fly.io 쪽에서 확인했다고 전달받았으나, 이 개발 세션이 실행되는 샌드박스는 아웃바운드 네트워크 정책상 `*.fly.dev`에 접근할 수 없어(egress 프록시가 403으로 차단) **세션 내에서 직접 재검증하지는 못했음**. 정확히 확인되지 않은 사실을 확인된 것처럼 기록하지 않기 위해 별도로 남긴다.

---

## 2026-08-15 — 초기 구현

- CLAUDE.md 지침에 따라 `get_district_air_quality` 단일 도구 MCP 서버 초기 구현.
- 스택: TypeScript + `@modelcontextprotocol/sdk` (stdio transport).
- API 응답 필드는 CLAUDE.md에 명시된 이름(MSRMT_YMD, MSRSTN_PBADMS_CD, MSRSTN_NM, CAI, CAI_GRD, CRST_SBSTN, NTDX, OZON, CBMX, SPDX, PM, FPM) 그대로 사용.
- 자치구 매칭: 정식 코드 매핑표 대신 API가 반환하는 `MSRSTN_NM`(자치구명)을 기준으로 느슨한 매칭(정식명/축약형/로마자)을 구현. MSRSTN_PBADMS_CD는 사용자에게 노출하지 않음(원칙 2).
- 개별 오염물질(PM10/PM2.5/O3/NO2/CO/SO2) 등급: 연동된 다른 MCP 중 CAI 등급 기준을 제공하는 것이 세션 내에 없어, CLAUDE.md 우선순위 2안대로 환경부 통합대기환경지수 항목별 등급 기준표를 `src/grades.ts`에 상수로 고정해 계산.
- 에러 처리: fetch 실패, HTTP 비정상 응답, API RESULT.CODE가 ERROR-3xx/5xx/6xx인 경우 모두 "일시적 오류, 잠시 후 재시도해주세요."로 단순화.
- `.env`는 `.gitignore`에 추가, `SEOUL_API_KEY` 환경변수로 인증키 주입. `.env.example` 제공.
- 캐싱은 아직 미적용 (CLAUDE.md에 따라 rate limit 문제 발생 시 재검토 예정).
- **[PR #1](https://github.com/hlucent/seoul-district-air-mcp/pull/1) 생성 및 10:28 병합.**

## 2026-08-15 (2차) — fly.io 배포 대응

- 전송 방식을 stdio에서 **Streamable HTTP**(`StreamableHTTPServerTransport`)로 전환. stdio는 남겨두지 않고 HTTP 전용으로 교체.
- `src/server.ts`에 `createMcpServer(apiKey)` 팩토리를 분리하고, `src/index.ts`는 `node:http` 서버로 `POST /mcp` 요청마다 서버/트랜스포트를 새로 생성하는 stateless 방식 채택(`sessionIdGenerator: undefined`). 별도 인증 없이 공개로 열 예정이라 세션 상태를 아예 두지 않는 쪽이 단순하고 안전.
- `GET /health` 헬스체크 엔드포인트 추가 (fly.io http_service 체크에 사용).
- 리스닝 포트는 `PORT` 환경변수를 읽음 (기본값 8080), fly.toml에서 8080으로 고정.
- Node 20 기반 멀티스테이지 `Dockerfile` 작성: build 스테이지에서 `tsc` 컴파일, runtime 스테이지는 `dist`와 production 의존성만 포함해 이미지 최소화. lockfile을 커밋하지 않으므로 `npm ci` 대신 `npm install` 사용.
- `fly.toml` 작성: 앱 이름 `seoul-district-air-mcp`, `internal_port 8080`, `PORT=8080` 환경변수 주입, `/health` 헬스체크, `force_https`, 트래픽 없을 때 머신 정지(`auto_stop_machines`).
- `SEOUL_API_KEY`는 코드 변경 없이 `process.env.SEOUL_API_KEY` 그대로 사용 — `fly secrets set`으로 주입하는 것을 전제로 함.
- 로컬에서 `node dist/index.js` 실행 후 `curl /health`, `curl -X POST /mcp` (`tools/list`)로 HTTP 전송이 정상 동작함을 확인. Docker 데몬이 이 세션 샌드박스에 없어 `docker build` 자체는 테스트하지 못함 — 실제 배포 전 로컬에서 한 번 빌드 확인 권장.
- README에 전송 방식, 로컬 실행, fly.io 최초 배포/재배포/시크릿 갱신 방법 섹션 추가.
- **[PR #2](https://github.com/hlucent/seoul-district-air-mcp/pull/2) 생성 및 11:01 병합.**

## 2026-08-15 (3차) — 시민 공개 이용 구조 점검

"시민이 API 키 없이 URL만으로 접속" 요구사항 충족 여부를 코드 전체 재점검.

- **인증 요구 없음**: `/mcp` 핸들러에 헤더/토큰 검사 없음. 확인 완료, 수정 없음.
- **Rate limit 에러 처리**: 서울 열린데이터광장 실제 rate limit 코드(`ERROR-336`, 일별 트래픽 제한 초과)는 기존 정규식(`ERROR-3/5/6xx`)에 이미 걸려 시민 친화 메시지로 나감. 점검 중 별도 문제 발견 — `ERROR-4xx`(인증키 오류, 즉 서버가 심어둔 키 자체 문제)는 정규식에 안 걸려 API 원문 메시지가 그대로 노출되고 있었음. 이는 rate limit 문제는 아니지만 시민에게 서버 내부 사정(키 상태)을 노출하는 문제라 `src/api.ts`를 수정: 코드 접두사 구분 없이 `INFO-0`이 아닌 모든 RESULT.CODE를 동일하게 "일시적 오류, 잠시 후 재시도해주세요."로 단순화.
- **동시 접속 안전성**: `handleMcpRequest`가 요청마다 `createMcpServer` + 새 `StreamableHTTPServerTransport`를 생성(stateless, `sessionIdGenerator: undefined`)하고 응답 종료 시 정리. `districts.ts`/`grades.ts`의 매핑·기준표는 읽기 전용 모듈 상수라 동시 요청 간 공유돼도 안전. 요청 간 공유되는 가변 전역 상태 없음을 재확인. 수정 없음.
- README에 "시민은 별도 인증키 없이 이 URL만 등록하면 됨" 안내를 기존 클라이언트 연결 예시 섹션에 통합.
- **[PR #3](https://github.com/hlucent/seoul-district-air-mcp/pull/3) 생성 및 12:22 병합.**

## 2026-08-15 (4차) — 실배포 완료 반영 및 문서 정비

- 사용자가 세션 밖에서 fly.io 앱 생성 → `fly secrets set SEOUL_API_KEY=...` → `fly deploy`까지 완료. 실제 서비스 URL 확정: `https://seoul-district-air-mcp.fly.dev/mcp`.
- 이 세션 샌드박스에서 `curl https://seoul-district-air-mcp.fly.dev/health` 및 `POST /mcp` (`tools/list`)로 직접 재검증을 시도했으나, 아웃바운드 egress 프록시가 `*.fly.dev`를 허용하지 않아(`CONNECT tunnel failed, 403`) 실패. 배포 자체의 정상 동작은 사용자 확인에 의존하며, 세션 내 자체 검증은 수행하지 못했음을 기록.
- README를 "로컬 실행법" 중심에서 **시민 우선(배포된 URL 등록 방법)** 구조로 재편:
  - 최상단 요약에 "인증키 필요 없음, URL만 등록하면 바로 사용 가능" 한 줄 추가.
  - "MCP 클라이언트 연결 예시"를 "사용 방법(시민용)" 섹션으로 바꾸고, Claude Desktop(`mcp-remote` 브리지 경유)과 Claude Code/원격 HTTP 지원 클라이언트(URL 직접 등록, `claude mcp add --transport http`) 두 가지 등록 예시를 구체적으로 제공.
  - 기존 "로컬 설정"/"fly.io 배포" 내용은 삭제하지 않고 "개발자용 — 직접 호스팅하고 싶은 경우" 섹션으로 이동.
- **원칙 추가**: CLAUDE.md에 "완료된 작업은 즉시 DEVLOG에 기록" 항목을 추가하여, 앞으로 기능 추가/버그 수정/재배포 등 작업 단위가 끝날 때마다 날짜와 함께 자동으로 DEVLOG에 기록하는 것을 원칙화함 (아래 CLAUDE.md 변경 참고).

## 2026-08-16 — rate limit 미들웨어 3단계 구현

3차 점검에서 인증 없는 공개 서버임을 재확인한 뒤, 기존 단일 규칙(분당 20회)만으로는 부족하다는 지침 변경 요청에 따라 3단계로 재구현.

- `src/rateLimit.ts` 신규 작성. IP별 상태(분당 요청 시각, 24시간 요청 시각, 1시간 내 429 시각, 차단 만료 시각)를 메모리 Map으로 관리하는 `checkRateLimit(ip, now)` 구현.
  1. 분당(60초 슬라이딩 윈도우) 3회 초과 → 429 (`per_minute`)
  2. 1시간 내 429 응답을 5회 이상 받은 IP는 이후 24시간 모든 요청 차단 (`blocked`)
  3. IP당 24시간 rolling 총 호출 30회 초과 → 429 (`daily`)
- `src/index.ts`의 기존 단일 rate limit 로직(분당 20회)을 제거하고 `checkRateLimit` 호출로 교체.
- CLAUDE.md에 "Rate limit 미들웨어 (2026-08-16 지침 변경)" 절을 신설해 3단계 스펙과 임계값(3/5/30)을 명문화. 참고: 이 스펙은 기존 CLAUDE.md 원문("확장 후보 — 캐싱/rate limit은 문제 실제 발생 시 재검토")에는 없던 내용으로, 사용자 요청을 받아 명시적 지침 변경으로 반영함.
- 검증: `now`를 인자로 주입해 시간 흐름을 시뮬레이션하는 로컬 스크립트로 세 케이스(분당 초과, 429 5회 후 24시간 차단 및 만료 후 해제, 24시간 30회 초과 시점)를 모두 확인. 실제 `tsx src/index.ts`로 별도 포트(8081)에 HTTP 서버를 띄우고 연속 curl 요청으로 분당 3회 제한(1~3번 200, 4번째부터 429) 동작도 재확인. 배포는 하지 않음.
