import { REGIONS, STATE_NAMES, UFS, type RegionKey } from "@/lib/regions";

const BASE_URL = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados";
const ELECTION_FILE = "e006257";
const PRESIDENT_OFFICE = "c0001";

type UnknownRecord = Record<string, unknown>;

export type CandidateResult = {
  number: string;
  name: string;
  fullName: string;
  party: string;
  votes: number;
  percent: number;
  status?: string;
};

export type ElectionResult = {
  scope: string;
  name: string;
  generatedAt: string;
  generationId: string;
  sectionsTotal: number;
  sectionsCounted: number;
  countedPercent: number;
  candidates: CandidateResult[];
};

export type RegionResult = ElectionResult & {
  region: RegionKey;
  statesLoaded: number;
  statesExpected: number;
};

export type ElectionSnapshot = {
  fetchedAt: string;
  source: string;
  national: ElectionResult;
  states: Record<string, ElectionResult>;
  regions: RegionResult[];
  partial: boolean;
  failedStates: string[];
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function candidateList(raw: UnknownRecord): CandidateResult[] {
  const candidates: CandidateResult[] = [];

  for (const cargoValue of asArray(raw.carg)) {
    const cargo = asRecord(cargoValue);

    for (const agrValue of asArray(cargo.agr)) {
      const agr = asRecord(agrValue);

      for (const partyValue of asArray(agr.par)) {
        const party = asRecord(partyValue);
        const partyAcronym = text(party.sg);

        for (const candidateValue of asArray(party.cand)) {
          const candidate = asRecord(candidateValue);

          candidates.push({
            number: text(candidate.n),
            name: text(candidate.nmu) || text(candidate.nm),
            fullName: text(candidate.nm) || text(candidate.nmu),
            party: partyAcronym,
            votes: toNumber(candidate.vap),
            percent: toNumber(candidate.pvap),
            status: text(candidate.st) || undefined,
          });
        }
      }
    }
  }

  return candidates.sort((a, b) => b.votes - a.votes);
}

function parseResult(rawValue: unknown, scope: string, name: string): ElectionResult {
  const raw = asRecord(rawValue);
  const sections = asRecord(raw.s);
  const date = text(raw.dg);
  const time = text(raw.hg);

  return {
    scope,
    name,
    generatedAt: date && time ? `${date} ${time}` : "",
    generationId: text(raw.idg),
    sectionsTotal: toNumber(sections.ts),
    sectionsCounted: toNumber(sections.st),
    countedPercent: toNumber(sections.pst),
    candidates: candidateList(raw),
  };
}

function resultUrl(scope: string): string {
  const normalized = scope.toLowerCase();
  return `${BASE_URL}/${normalized}/${normalized}-${PRESIDENT_OFFICE}-${ELECTION_FILE}-u.json`;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 8 },
  });

  if (!response.ok) {
    throw new Error(`TSE returned HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchScope(scope: string, name: string): Promise<ElectionResult> {
  return parseResult(await fetchJson(resultUrl(scope)), scope.toUpperCase(), name);
}

function aggregateRegion(
  region: RegionKey,
  states: Record<string, ElectionResult>,
): RegionResult {
  const definition = REGIONS[region];
  const available = definition.states
    .map((uf) => states[uf])
    .filter((item): item is ElectionResult => Boolean(item));

  const candidateMap = new Map<string, CandidateResult>();

  for (const state of available) {
    for (const candidate of state.candidates) {
      const current = candidateMap.get(candidate.number);
      if (current) {
        current.votes += candidate.votes;
      } else {
        candidateMap.set(candidate.number, {
          ...candidate,
          votes: candidate.votes,
          percent: 0,
        });
      }
    }
  }

  const candidates = [...candidateMap.values()].sort((a, b) => b.votes - a.votes);
  const candidateVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  for (const candidate of candidates) {
    candidate.percent = candidateVotes > 0 ? (candidate.votes / candidateVotes) * 100 : 0;
  }

  const sectionsTotal = available.reduce((sum, state) => sum + state.sectionsTotal, 0);
  const sectionsCounted = available.reduce((sum, state) => sum + state.sectionsCounted, 0);

  return {
    scope: region,
    region,
    name: definition.name,
    generatedAt: available.map((state) => state.generatedAt).sort().at(-1) ?? "",
    generationId: "",
    sectionsTotal,
    sectionsCounted,
    countedPercent: sectionsTotal > 0 ? (sectionsCounted / sectionsTotal) * 100 : 0,
    candidates,
    statesLoaded: available.length,
    statesExpected: definition.states.length,
  };
}

export async function buildSnapshot(): Promise<ElectionSnapshot> {
  const nationalPromise = fetchScope("br", "Brasil");

  const stateEntries = await Promise.all(
    UFS.map(async (uf) => {
      try {
        const result = await fetchScope(uf, STATE_NAMES[uf]);
        return [uf, result, null] as const;
      } catch (error) {
        return [uf, null, error] as const;
      }
    }),
  );

  const national = await nationalPromise;
  const states: Record<string, ElectionResult> = {};
  const failedStates: string[] = [];

  for (const [uf, result] of stateEntries) {
    if (result) states[uf] = result;
    else failedStates.push(uf);
  }

  const regions = (Object.keys(REGIONS) as RegionKey[]).map((region) =>
    aggregateRegion(region, states),
  );

  return {
    fetchedAt: new Date().toISOString(),
    source: "Tribunal Superior Eleitoral (TSE) — EA20",
    national,
    states,
    regions,
    partial: failedStates.length > 0,
    failedStates,
  };
}
