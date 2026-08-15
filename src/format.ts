import type { DistrictAirRow } from "./api.js";
import { gradeOf } from "./grades.js";

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formatItem(label: string, value: string | undefined, unit: string, grade: string | null): string {
  const n = toNumber(value);
  const displayValue = n === null ? "정보없음" : `${n}${unit}`;
  const displayGrade = grade ? ` (${grade})` : "";
  return `${label}: ${displayValue}${displayGrade}`;
}

export function formatDistrict(row: DistrictAirRow): string {
  const pm10Grade = gradeOf("PM10", toNumber(row.PM));
  const pm25Grade = gradeOf("PM25", toNumber(row.FPM));
  const o3Grade = gradeOf("O3", toNumber(row.OZON));
  const no2Grade = gradeOf("NO2", toNumber(row.NTDX));
  const coGrade = gradeOf("CO", toNumber(row.CBMX));
  const so2Grade = gradeOf("SO2", toNumber(row.SPDX));

  const lines = [
    `자치구: ${row.MSRSTN_NM}`,
    `측정시각: ${row.MSRMT_YMD}`,
    `통합대기환경지수(CAI): ${row.CAI ?? "정보없음"} (${row.CAI_GRD ?? "정보없음"})`,
    `지수결정물질: ${row.CRST_SBSTN || "정보없음"}`,
    formatItem("PM10(미세먼지)", row.PM, "µg/m³", pm10Grade),
    formatItem("PM2.5(초미세먼지)", row.FPM, "µg/m³", pm25Grade),
    formatItem("오존(O3)", row.OZON, "ppm", o3Grade),
    formatItem("이산화질소(NO2)", row.NTDX, "ppm", no2Grade),
    formatItem("일산화탄소(CO)", row.CBMX, "ppm", coGrade),
    formatItem("아황산가스(SO2)", row.SPDX, "ppm", so2Grade),
  ];

  return lines.join("\n");
}

export function formatAllDistricts(rows: DistrictAirRow[]): string {
  const sections = rows.map(formatDistrict);

  const withCai = rows
    .map((row) => ({ row, cai: toNumber(row.CAI) }))
    .filter((r): r is { row: DistrictAirRow; cai: number } => r.cai !== null);

  let summary = "";
  if (withCai.length > 0) {
    const best = withCai.reduce((a, b) => (b.cai < a.cai ? b : a));
    const worst = withCai.reduce((a, b) => (b.cai > a.cai ? b : a));
    summary =
      `\n\n[요약]\n` +
      `공기가 가장 좋은 구: ${best.row.MSRSTN_NM} (CAI ${best.cai}, ${best.row.CAI_GRD})\n` +
      `공기가 가장 나쁜 구: ${worst.row.MSRSTN_NM} (CAI ${worst.cai}, ${worst.row.CAI_GRD})`;
  }

  return sections.join("\n\n---\n\n") + summary;
}
