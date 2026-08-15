# 개발일지

## 2026-08-15

- CLAUDE.md 지침에 따라 `get_district_air_quality` 단일 도구 MCP 서버 초기 구현.
- 스택: TypeScript + `@modelcontextprotocol/sdk` (stdio transport).
- API 응답 필드는 CLAUDE.md에 명시된 이름(MSRMT_YMD, MSRSTN_PBADMS_CD, MSRSTN_NM, CAI, CAI_GRD, CRST_SBSTN, NTDX, OZON, CBMX, SPDX, PM, FPM) 그대로 사용.
- 자치구 매칭: 정식 코드 매핑표 대신 API가 반환하는 `MSRSTN_NM`(자치구명)을 기준으로 느슨한 매칭(정식명/축약형/로마자)을 구현. MSRSTN_PBADMS_CD는 사용자에게 노출하지 않음(원칙 2).
- 개별 오염물질(PM10/PM2.5/O3/NO2/CO/SO2) 등급: 연동된 다른 MCP 중 CAI 등급 기준을 제공하는 것이 세션 내에 없어, CLAUDE.md 우선순위 2안대로 환경부 통합대기환경지수 항목별 등급 기준표를 `src/grades.ts`에 상수로 고정해 계산.
- 에러 처리: fetch 실패, HTTP 비정상 응답, API RESULT.CODE가 ERROR-3xx/5xx/6xx인 경우 모두 "일시적 오류, 잠시 후 재시도해주세요."로 단순화.
- `.env`는 `.gitignore`에 추가, `SEOUL_API_KEY` 환경변수로 인증키 주입. `.env.example` 제공.
- 캐싱은 아직 미적용 (CLAUDE.md에 따라 rate limit 문제 발생 시 재검토 예정).

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
