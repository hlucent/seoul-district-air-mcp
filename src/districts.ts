// 서울시 25개 자치구. API 응답의 MSRSTN_NM 값과 정확히 일치해야 한다.
export const SEOUL_DISTRICTS = [
  "종로구",
  "중구",
  "용산구",
  "성동구",
  "광진구",
  "동대문구",
  "중랑구",
  "성북구",
  "강북구",
  "도봉구",
  "노원구",
  "은평구",
  "서대문구",
  "마포구",
  "양천구",
  "강서구",
  "구로구",
  "금천구",
  "영등포구",
  "동작구",
  "관악구",
  "서초구",
  "강남구",
  "송파구",
  "강동구",
] as const;

export type DistrictName = (typeof SEOUL_DISTRICTS)[number];

// 느슨한 매칭용 별칭: 정식 구명 -> [축약형/로마자 등 추가 별칭]
const ALIASES: Record<DistrictName, string[]> = {
  종로구: ["종로", "jongno"],
  중구: ["중구", "jung-gu", "junggu"],
  용산구: ["용산", "yongsan"],
  성동구: ["성동", "seongdong"],
  광진구: ["광진", "gwangjin"],
  동대문구: ["동대문", "dongdaemun"],
  중랑구: ["중랑", "jungnang"],
  성북구: ["성북", "seongbuk"],
  강북구: ["강북", "gangbuk"],
  도봉구: ["도봉", "dobong"],
  노원구: ["노원", "nowon"],
  은평구: ["은평", "eunpyeong"],
  서대문구: ["서대문", "seodaemun"],
  마포구: ["마포", "mapo"],
  양천구: ["양천", "yangcheon"],
  강서구: ["강서", "gangseo"],
  구로구: ["구로", "guro"],
  금천구: ["금천", "geumcheon"],
  영등포구: ["영등포", "yeongdeungpo"],
  동작구: ["동작", "dongjak"],
  관악구: ["관악", "gwanak"],
  서초구: ["서초", "seocho"],
  강남구: ["강남", "gangnam"],
  송파구: ["송파", "songpa"],
  강동구: ["강동", "gangdong"],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * 느슨한 자치구명 매칭. "강남", "강남구", "gangnam" 모두 "강남구"로 매칭.
 * 25개 구 리스트 밖의 입력은 null을 반환한다.
 */
export function matchDistrict(input: string): DistrictName | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  for (const district of SEOUL_DISTRICTS) {
    if (normalize(district) === normalized) return district;
  }

  for (const district of SEOUL_DISTRICTS) {
    const aliases = ALIASES[district];
    if (aliases.some((alias) => normalize(alias) === normalized)) {
      return district;
    }
  }

  return null;
}
