import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchDistrictAirQuality, SeoulApiError } from "./api.js";
import { matchDistrict, SEOUL_DISTRICTS } from "./districts.js";
import { formatAllDistricts, formatDistrict } from "./format.js";

export function createMcpServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "seoul-district-air-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_district_air_quality",
    {
      title: "서울 자치구 대기환경 조회",
      description:
        "서울시 25개 자치구의 실시간 대기환경 현황을 조회한다. district를 지정하면 해당 구만, " +
        "생략하면 25개 구 전체와 최고/최악 구 요약을 반환한다.",
      inputSchema: {
        district: z
          .string()
          .optional()
          .describe('자치구명. "강남", "강남구", "gangnam"처럼 느슨한 표기 가능. 생략 시 전체 조회.'),
      },
    },
    async ({ district }) => {
      let matched: string | null = null;
      if (district !== undefined && district.trim() !== "") {
        matched = matchDistrict(district);
        if (!matched) {
          return {
            content: [
              {
                type: "text",
                text: `"${district}"에 해당하는 자치구를 찾을 수 없습니다. 정확한 자치구명을 확인해주세요. (예: ${SEOUL_DISTRICTS.slice(
                  0,
                  3
                ).join(", ")} 등 서울 25개 구)`,
              },
            ],
          };
        }
      }

      try {
        const rows = await fetchDistrictAirQuality(apiKey);

        if (matched) {
          const row = rows.find((r) => r.MSRSTN_NM === matched);
          if (!row) {
            return {
              content: [{ type: "text", text: "일시적 오류, 잠시 후 재시도해주세요." }],
            };
          }
          return { content: [{ type: "text", text: formatDistrict(row) }] };
        }

        return { content: [{ type: "text", text: formatAllDistricts(rows) }] };
      } catch (err) {
        const message = err instanceof SeoulApiError ? err.message : "일시적 오류, 잠시 후 재시도해주세요.";
        return { content: [{ type: "text", text: message }] };
      }
    }
  );

  return server;
}
