import { NextResponse } from "next/server";
import { buildSnapshot, type ElectionSnapshot } from "@/lib/tse";

export const dynamic = "force-dynamic";

type CacheState = {
  expiresAt: number;
  value?: ElectionSnapshot;
  pending?: Promise<ElectionSnapshot>;
};

const globalCache = globalThis as typeof globalThis & {
  __electionSnapshotCache?: CacheState;
};

function cache(): CacheState {
  if (!globalCache.__electionSnapshotCache) {
    globalCache.__electionSnapshotCache = { expiresAt: 0 };
  }

  return globalCache.__electionSnapshotCache;
}

export async function GET() {
  const state = cache();
  const now = Date.now();

  try {
    if (state.value && state.expiresAt > now) {
      return NextResponse.json(state.value, {
        headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" },
      });
    }

    if (!state.pending) {
      state.pending = buildSnapshot().finally(() => {
        state.pending = undefined;
      });
    }

    const snapshot = await state.pending;
    state.value = snapshot;
    state.expiresAt = Date.now() + 8_000;

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";

    return NextResponse.json(
      {
        error: "Não foi possível consultar os dados oficiais do TSE.",
        detail: message,
      },
      { status: 502 },
    );
  }
}
