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
