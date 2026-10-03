import cors from "@fastify/cors";
import type { FastifyError, FastifyInstance, FastifyRequest } from "fastify";
import Fastify from "fastify";
import type Database from "better-sqlite3";
import { previewRequestSchema } from "./audience";
import { openDatabase } from "./db";
import { evaluateAudience } from "./evaluator";

interface ErrorDetail {
  path: string;
  message: string;
}

interface ErrorResponse {
  error: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
    details?: ErrorDetail[];
  };
}

function validationResponse(message: string, details: ErrorDetail[] = []): ErrorResponse {
  return { error: { code: "VALIDATION_ERROR", message, details } };
}

function errorResponse(
  code: ErrorResponse["error"]["code"],
  message: string
): ErrorResponse {
  return { error: { code, message } };
}

function logError(requestId: string, error: unknown): void {
  console.error(JSON.stringify({
    requestId,
    message: error instanceof Error ? error.message : "unknown error"
  }));
}

export function buildServer(database: Database.Database = openDatabase()): FastifyInstance {
  const server = Fastify({ logger: false });
  const requestStartTimes = new WeakMap<FastifyRequest, bigint>();

  void server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173"
  });

  server.addHook("onRequest", async (request) => {
    requestStartTimes.set(request, process.hrtime.bigint());
  });

  server.addHook("onResponse", async (request, reply) => {
    const startedAt = requestStartTimes.get(request) ?? process.hrtime.bigint();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(JSON.stringify({
      method: request.method,
      path: request.url,
      status: reply.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    }));
  });

  server.get("/health", async () => ({ status: "ok" }));

  server.post("/v1/audiences/preview", async (request, reply) => {
    const parsedRequest = previewRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      return reply.status(400).send(validationResponse(
        "Request validation failed",
        parsedRequest.error.issues.map((issue) => ({
          path: issue.path.map(String).join(".") || "request",
          message: issue.message
        }))
      ));
    }

    return evaluateAudience(parsedRequest.data, database);
  });

  server.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send(errorResponse("NOT_FOUND", "Route not found"));
  });

  server.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.code === "FST_ERR_CTP_INVALID_JSON" || error.code === "FST_ERR_CTP_INVALID_JSON_BODY") {
      logError(request.id, error);
      return reply.status(400).send(validationResponse("Malformed JSON request body"));
    }

    logError(request.id, error);
    return reply.status(500).send(errorResponse("INTERNAL_ERROR", "Internal server error"));
  });

  server.addHook("onClose", async () => {
    database.close();
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = buildServer();
  const port = Number(process.env.PORT ?? 3001);

  try {
    await server.listen({ port, host: "0.0.0.0" });
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void startServer();
}
