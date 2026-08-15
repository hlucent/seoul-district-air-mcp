const SERVICE = "ListAirQualityByDistrictService";
const BASE_URL = "http://openapi.seoul.go.kr:8088";

// CLAUDE.md에 명시된 출력 필드 그대로 사용.
export interface DistrictAirRow {
  MSRMT_YMD: string; // 측정일시
  MSRSTN_PBADMS_CD: string; // 자치구 코드 (사용자에게 노출 금지)
  MSRSTN_NM: string; // 자치구명
  CAI: string; // 통합대기환경지수
  CAI_GRD: string; // CAI 등급
  CRST_SBSTN: string; // 지수결정물질
  NTDX: string; // NO2
  OZON: string; // O3
  CBMX: string; // CO
  SPDX: string; // SO2
  PM: string; // PM10
  FPM: string; // PM2.5
  [key: string]: string | undefined;
}

export class SeoulApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeoulApiError";
  }
}

export async function fetchDistrictAirQuality(apiKey: string): Promise<DistrictAirRow[]> {
  const url = `${BASE_URL}/${apiKey}/json/${SERVICE}/1/25`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new SeoulApiError("일시적 오류, 잠시 후 재시도해주세요.");
  }

  if (!res.ok) {
    throw new SeoulApiError("일시적 오류, 잠시 후 재시도해주세요.");
  }

  const data = (await res.json()) as Record<string, unknown>;
  const body = data[SERVICE] as
    | { RESULT?: { CODE?: string; MESSAGE?: string }; row?: DistrictAirRow[] }
    | undefined;

  // 인증/파라미터 오류는 최상위 RESULT로 오는 경우도 있다.
  const topResult = data.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
  const result = body?.RESULT ?? topResult;

  if (result?.CODE && !result.CODE.startsWith("INFO-0")) {
    if (/^ERROR-(3|5|6)\d\d/.test(result.CODE)) {
      throw new SeoulApiError("일시적 오류, 잠시 후 재시도해주세요.");
    }
    throw new SeoulApiError(result.MESSAGE ?? "일시적 오류, 잠시 후 재시도해주세요.");
  }

  if (!body?.row || body.row.length === 0) {
    throw new SeoulApiError("일시적 오류, 잠시 후 재시도해주세요.");
  }

  return body.row;
}
