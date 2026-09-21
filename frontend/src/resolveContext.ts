import { ConversationTurn } from "./conversationMemory";

const RESOLVE_CONTEXT_API_URL = `${process.env.REACT_APP_API_URL ?? ""}/api/resolve-context`;

export interface ResolveContextResult {
  resolvedQuery: string;
  isFollowUp: boolean;
}

export async function resolveContext(
  query: string,
  history: ConversationTurn[]
): Promise<ResolveContextResult> {
  if (history.length === 0) {
    return { resolvedQuery: query, isFollowUp: false };
  }

  const historyPayload = history.map((turn) => ({
    query: turn.query,
    herb_name: turn.herbName ?? null
  }));

  try {
    const response = await fetch(RESOLVE_CONTEXT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, history: historyPayload }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (typeof data?.resolved_query !== "string") {
      throw new Error("Invalid resolve-context response format");
    }

    return {
      resolvedQuery: data.resolved_query,
      isFollowUp: Boolean(data.is_follow_up),
    };
  } catch (error) {
    console.warn("⚠️ resolveContext failed, falling back to original query:", error);
    return { resolvedQuery: query, isFollowUp: false };
  }
}