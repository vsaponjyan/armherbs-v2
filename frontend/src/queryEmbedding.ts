// src/queryEmbedding.ts

//const EMBED_API_URL = "http://localhost:8000/api/embed";
const EMBED_API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/embed`;

// ===============================
// ✅ text-embedding-3-large → 3072
// ===============================
const EXPECTED_EMBEDDING_DIM = 3072;

export async function embedText(text: string): Promise<number[]> {
  if (!text.trim()) {
    throw new Error("Query cannot be empty");
  }

  let response: Response;

  try {
    response = await fetch(EMBED_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000), // 🆕 10→15 sec (expansion-ը ժամ է պահանջում)
    });
  } catch (networkError) {
    if (
      networkError instanceof Error &&
      networkError.name === "TimeoutError"
    ) {
      throw new Error("Embedding request timed out. Please try again.");
    }
    throw new Error(
      "Cannot connect to embedding service. Please check if backend is running."
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("❌ Backend error:", response.status, errorText);
    throw new Error(`Embedding service error: ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from embedding service");
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("embedding" in data) ||
    !Array.isArray((data as { embedding: unknown }).embedding)
  ) {
    throw new Error("Invalid embedding response format");
  }

  const embedding = (data as { embedding: number[] }).embedding;

  if (embedding.length === 0) {
    throw new Error("Received empty embedding");
  }

  // ✅ Ճիշտ dimension check — 3072
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    console.warn(
      `⚠️ Unexpected embedding size: ${embedding.length} (expected ${EXPECTED_EMBEDDING_DIM})`
    );
  }

  if (embedding.some((val) => typeof val !== "number" || !isFinite(val))) {
    throw new Error("Embedding contains invalid values");
  }

  return embedding;
}