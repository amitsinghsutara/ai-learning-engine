import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok", service: "ai-learning-engine" }));

  app.get("/health/ollama", async () => {
    const health = await app.aiProvider.checkHealth?.();
    if (!health) {
      // Non-Ollama providers may not implement a health check; treat as available.
      return { available: true, model: "unknown" };
    }
    return { available: health.available, model: health.model };
  });
}
