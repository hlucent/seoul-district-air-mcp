# seoul-district-air-mcp

"지금 우리 동네 공기 어때?"에 즉시 답하는 단일 목적 MCP 서버.

서울 열린데이터광장의 **"서울시 실시간 자치구별 대기환경 현황"** (`ListAirQualityByDistrictService`) 데이터셋 하나만 다룬다.

## 도구

### `get_district_air_quality`

- `district` (선택): 자치구명. "강남", "강남구", "gangnam"처럼 느슨한 표기 허용. 서울 25개 구 안에서만 매칭하며, 매칭 실패 시 안내 문구를 반환한다.
- `district` 생략 시: 25개 구 전체 현황 + 공기가 가장 좋은/나쁜 구 요약을 반환한다.

반환 항목: 자치구, 측정시각, 통합대기환경지수(CAI, 등급), 지수결정물질, PM10/PM2.5/O3/NO2/CO/SO2 (각 수치 + 등급).

개별 오염물질 등급은 API가 제공하지 않아 환경부 통합대기환경지수(CAI) 항목별 등급 기준을 코드(`src/grades.ts`)에 상수로 고정해 계산한다.

## 전송 방식

MCP SDK의 **Streamable HTTP** 전송(`StreamableHTTPServerTransport`)을 사용한다. 인증 없는 공개 stateless 서버로, 요청마다 서버/트랜스포트를 새로 생성해 세션 상태를 갖지 않는다.

- MCP 엔드포인트: `POST /mcp`
- 헬스체크: `GET /health`
- 리스닝 포트: `PORT` 환경변수 (기본값 8080)

## 로컬 설정

1. `.env.example`을 `.env`로 복사하고 `SEOUL_API_KEY`에 발급받은 서울 열린데이터광장 인증키를 입력한다.
2. 의존성 설치: `npm install`
3. 빌드: `npm run build`
4. 실행: `npm start` (또는 개발 중에는 `npm run dev`)

`.env`는 `.gitignore`에 포함되어 저장소에 커밋되지 않는다.

## MCP 클라이언트 연결 예시

누구나 별도 인증키 없이 아래 URL만 MCP 클라이언트에 등록하면 바로 쓸 수 있다. 서울 열린데이터광장 API 인증키는 서버 운영자가 `fly secrets`로 서버에만 심어두므로, 클라이언트(시민)는 발급도 입력도 필요 없다.

```json
{
  "mcpServers": {
    "seoul-district-air": {
      "url": "https://seoul-district-air-mcp.fly.dev/mcp"
    }
  }
}
```

## fly.io 배포

Node 기반 멀티스테이지 `Dockerfile`과 `fly.toml`이 저장소에 포함되어 있다. 앱 이름은 `seoul-district-air-mcp`, 서버는 `PORT` 환경변수를 읽어 리스닝한다. 인증 없이 공개로 연다.

### 최초 배포

```bash
fly launch --no-deploy   # fly.toml이 이미 있으므로 앱만 생성, 기존 설정 유지
fly secrets set SEOUL_API_KEY=발급받은_인증키
fly deploy
```

### 재배포 (코드 변경 후)

```bash
fly deploy
```

### 로그 / 상태 확인

```bash
fly logs
fly status
```

### 시크릿 갱신

```bash
fly secrets set SEOUL_API_KEY=새_인증키
```

`SEOUL_API_KEY`는 코드에 하드코딩하지 않고 `fly secrets`로만 주입한다.

## 범위

이 프로젝트는 위 데이터셋 하나만 다룬다. 경보 현황, 도로변 측정 등 다른 대기 데이터셋은 다루지 않는다. 자세한 설계 원칙은 `CLAUDE.md` 참고.
