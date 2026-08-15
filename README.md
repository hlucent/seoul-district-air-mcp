# seoul-district-air-mcp

"지금 우리 동네 공기 어때?"에 즉시 답하는 단일 목적 MCP 서버.

서울 열린데이터광장의 **"서울시 실시간 자치구별 대기환경 현황"** (`ListAirQualityByDistrictService`) 데이터셋 하나만 다룬다.

## 도구

### `get_district_air_quality`

- `district` (선택): 자치구명. "강남", "강남구", "gangnam"처럼 느슨한 표기 허용. 서울 25개 구 안에서만 매칭하며, 매칭 실패 시 안내 문구를 반환한다.
- `district` 생략 시: 25개 구 전체 현황 + 공기가 가장 좋은/나쁜 구 요약을 반환한다.

반환 항목: 자치구, 측정시각, 통합대기환경지수(CAI, 등급), 지수결정물질, PM10/PM2.5/O3/NO2/CO/SO2 (각 수치 + 등급).

개별 오염물질 등급은 API가 제공하지 않아 환경부 통합대기환경지수(CAI) 항목별 등급 기준을 코드(`src/grades.ts`)에 상수로 고정해 계산한다.

## 설정

1. `.env.example`을 `.env`로 복사하고 `SEOUL_API_KEY`에 발급받은 서울 열린데이터광장 인증키를 입력한다.
2. 의존성 설치: `npm install`
3. 빌드: `npm run build`
4. 실행: `npm start` (또는 개발 중에는 `npm run dev`)

`.env`는 `.gitignore`에 포함되어 저장소에 커밋되지 않는다.

## MCP 클라이언트 연결 예시

```json
{
  "mcpServers": {
    "seoul-district-air": {
      "command": "node",
      "args": ["/path/to/seoul-district-air-mcp/dist/index.js"],
      "env": {
        "SEOUL_API_KEY": "발급받은_인증키"
      }
    }
  }
}
```

## 범위

이 프로젝트는 위 데이터셋 하나만 다룬다. 경보 현황, 도로변 측정 등 다른 대기 데이터셋은 다루지 않는다. 자세한 설계 원칙은 `CLAUDE.md` 참고.
