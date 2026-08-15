#!/usr/bin/env node
import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";

const apiKey = process.env.SEOUL_API_KEY;
if (!apiKey) {
  console.error("SEOUL_API_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8080;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : undefined;
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  // 인증 없는 공개 stateless 서버: 요청마다 서버/트랜스포트를 새로 만들어
  // 세션 상태를 갖지 않는다.
  const server = createMcpServer(apiKey!);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    const body = req.method === "POST" ? await readBody(req) : undefined;
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error("MCP 요청 처리 중 오류:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal server error" }));
    }
  }
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (url.pathname === "/mcp") {
    void handleMcpRequest(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

httpServer.listen(PORT, () => {
  console.log(`seoul-district-air-mcp listening on port ${PORT} (Streamable HTTP, /mcp)`);
});
