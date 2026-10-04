"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { REGIONS, type RegionKey } from "@/lib/regions";
import type {
  CandidateResult,
  ElectionResult,
  ElectionSnapshot,
  RegionResult,
} from "@/lib/tse";

const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];
const POLL_INTERVAL = 10_000;

const ACCENTS = [
  "hsl(193 95% 62%)",
  "hsl(267 92% 72%)",
  "hsl(151 72% 56%)",
  "hsl(37 96% 62%)",
  "hsl(336 92% 68%)",
  "hsl(218 92% 68%)",
];

type Scope = "br" | RegionKey | string;

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTseDate(value: string) {
  if (!value) return "aguardando atualização";
  const [date, time] = value.split(" ");
  return time ? `${time} · ${date}` : value;
}

function candidateAccent(index: number) {
  return ACCENTS[index % ACCENTS.length];
}

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${clamped * 3.6}deg` } as React.CSSProperties}
      aria-label={`${formatPercent(clamped)}% das seções totalizadas`}
    >
      <div>
        <strong>{formatPercent(clamped)}%</strong>
        <span>apurado</span>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  index,
}: {
  candidate: CandidateResult;
  index: number;
}) {
  const accent = candidateAccent(index);

  return (
    <article
      className="candidate-row"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="candidate-rank">{String(index + 1).padStart(2, "0")}</div>
      <div className="candidate-main">
        <div className="candidate-heading">
          <div>
            <strong>{candidate.name}</strong>
            <span>
              {candidate.number} · {candidate.party || "—"}
            </span>
          </div>
          <div className="candidate-percentage">{formatPercent(candidate.percent)}%</div>
        </div>

        <div className="candidate-track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, candidate.percent)}%` }} />
        </div>

        <div className="candidate-meta">
          <span>{formatNumber(candidate.votes)} votos</span>
          {candidate.status ? <span>{candidate.status}</span> : null}
        </div>
      </div>
    </article>
  );
}

function RegionCard({
  region,
  active,
  onClick,
}: {
  region: RegionResult;
  active: boolean;
  onClick: () => void;
}) {
  const leader = region.candidates[0];
  const runnerUp = region.candidates[1];
  const margin = leader && runnerUp ? leader.percent - runnerUp.percent : 0;

  return (
    <button className={`region-card ${active ? "is-active" : ""}`} onClick={onClick}>
      <div className="region-card-top">
        <span>{region.name}</span>
        <small>{REGIONS[region.region].short}</small>
      </div>
      <strong>{leader?.name ?? "Sem dados"}</strong>
      <div className="region-card-bottom">
        <span>{leader ? `${formatPercent(leader.percent)}%` : "—"}</span>
        <span>{leader && runnerUp ? `+${formatPercent(margin)} p.p.` : ""}</span>
      </div>
      <div className="mini-progress">
        <span style={{ width: `${Math.min(100, region.countedPercent)}%` }} />
      </div>
      <small>
        {formatPercent(region.countedPercent)}% apurado · {region.statesLoaded}/
        {region.statesExpected} UFs
      </small>
    </button>
  );
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<ElectionSnapshot | null>(null);
  const [scope, setScope] = useState<Scope>("br");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await fetch("/api/results", { cache: "no-store" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.detail || body?.error || "Falha ao consultar resultados");
      }

      setSnapshot(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao consultar resultados");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(), POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeResult = useMemo<ElectionResult | RegionResult | null>(() => {
    if (!snapshot) return null;
    if (scope === "br") return snapshot.national;

    const region = snapshot.regions.find((item) => item.region === scope);
    if (region) return region;

    return snapshot.states[String(scope).toUpperCase()] ?? snapshot.national;
  }, [snapshot, scope]);

  const activeRegion = useMemo(() => {
    if (!snapshot) return null;
    if (REGION_KEYS.includes(scope as RegionKey)) return scope as RegionKey;

    const uf = String(scope).toUpperCase();
    return (
      REGION_KEYS.find((key) =>
        (REGIONS[key].states as readonly string[]).includes(uf),
      ) ?? null
    );
  }, [snapshot, scope]);

  const visibleStates = useMemo(() => {
    if (!snapshot || !activeRegion) return [];
    return REGIONS[activeRegion].states
      .map((uf) => snapshot.states[uf])
      .filter((item): item is ElectionResult => Boolean(item));
  }, [snapshot, activeRegion]);

  const leader = activeResult?.candidates[0];
  const runnerUp = activeResult?.candidates[1];
  const margin = leader && runnerUp ? leader.percent - runnerUp.percent : 0;

  return (
    <main>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="topbar">
        <button className="brand" onClick={() => setScope("br")} aria-label="Voltar ao Brasil">
          <span className="brand-mark">A</span>
          <span>
            <strong>APURAÇÃO</strong>
            <small>Eleições 2026</small>
          </span>
        </button>

        <div className="live-pill">
          <i />
          <span>AO VIVO</span>
          <small>Dados oficiais TSE</small>
        </div>

        <button className="refresh-button" onClick={() => load(true)} disabled={refreshing}>
          <span className={refreshing ? "spin" : ""}>↻</span>
          {refreshing ? "Atualizando" : "Atualizar"}
        </button>
      </header>

      <section className="hero-shell">
        <div className="eyebrow">
          <span>1º turno</span>
          <span>04 outubro 2026</span>
          <span>Presidente</span>
        </div>

        <div className="hero-title-row">
          <div>
            <p className="overline">APURAÇÃO PRESIDENCIAL</p>
            <h1>{activeResult?.name ?? "Brasil"}</h1>
            <p className="hero-subtitle">
              Resultado em tempo real, organizado para mostrar rapidamente onde cada
              candidatura está mais forte.
            </p>
          </div>

          {activeResult ? <ProgressRing value={activeResult.countedPercent} /> : null}
        </div>

        <nav className="office-tabs" aria-label="Cargo">
          <button className="is-active">Presidente</button>
          <button disabled>Governador <small>em breve</small></button>
          <button disabled>Senador <small>em breve</small></button>
          <button disabled>Deputados <small>em breve</small></button>
        </nav>
      </section>

      <section className="scope-strip" aria-label="Abrangência">
        <button className={scope === "br" ? "is-active" : ""} onClick={() => setScope("br")}>
          Brasil
        </button>
        {snapshot?.regions.map((region) => (
          <button
            key={region.region}
            className={scope === region.region ? "is-active" : ""}
            onClick={() => setScope(region.region)}
          >
            {region.name}
          </button>
        ))}
      </section>

      {error ? (
        <section className="error-panel">
          <strong>Não foi possível atualizar os dados.</strong>
          <span>{error}</span>
          <button onClick={() => load(true)}>Tentar novamente</button>
        </section>
      ) : null}

      {loading && !snapshot ? (
        <section className="loading-panel">
          <div className="loader" />
          <strong>Consultando a apuração oficial...</strong>
          <span>Carregando Brasil e as 27 UFs.</span>
        </section>
      ) : null}

      {snapshot && activeResult ? (
        <>
          <section className="summary-grid">
            <article className="summary-card summary-card--main">
              <span className="metric-label">Liderança</span>
              <strong>{leader?.name ?? "—"}</strong>
              <div className="hero-percentage">
                {leader ? formatPercent(leader.percent) : "—"}
                {leader ? <sup>%</sup> : null}
              </div>
              <div className="summary-line">
                <span>{leader ? formatNumber(leader.votes) : "0"} votos</span>
                {runnerUp ? <span>margem +{formatPercent(margin)} p.p.</span> : null}
              </div>
            </article>

            <article className="summary-card">
              <span className="metric-label">Seções totalizadas</span>
              <strong>{formatNumber(activeResult.sectionsCounted)}</strong>
              <p>de {formatNumber(activeResult.sectionsTotal)} seções</p>
            </article>

            <article className="summary-card">
              <span className="metric-label">Última geração TSE</span>
              <strong>{formatTseDate(activeResult.generatedAt)}</strong>
              <p>
                {activeResult.generationId
                  ? `IDG ${activeResult.generationId}`
                  : "agregação regional calculada pelo site"}
              </p>
            </article>
          </section>

          {snapshot.partial ? (
            <div className="partial-warning">
              Atualização parcial: não foi possível carregar {snapshot.failedStates.join(", ")}.
              As regiões afetadas mostram quantas UFs foram consideradas.
            </div>
          ) : null}

          <section className="content-grid">
            <div className="panel ranking-panel">
              <div className="panel-heading">
                <div>
                  <span className="metric-label">RESULTADO</span>
                  <h2>Corrida presidencial</h2>
                </div>
                <span className="muted">ordem por votos computados</span>
              </div>

              <div className="candidate-list">
                {activeResult.candidates.map((candidate, index) => (
                  <CandidateRow
                    key={`${candidate.number}-${candidate.party}`}
                    candidate={candidate}
                    index={index}
                  />
                ))}
              </div>
            </div>

            <aside className="panel insight-panel">
              <div className="panel-heading">
                <div>
                  <span className="metric-label">LEITURA RÁPIDA</span>
                  <h2>Agora</h2>
                </div>
              </div>

              <div className="insight-big">
                <span>Diferença entre 1º e 2º</span>
                <strong>{leader && runnerUp ? formatPercent(margin) : "—"} p.p.</strong>
              </div>

              {leader && runnerUp ? (
                <div className="versus">
                  <div>
                    <span>{leader.name}</span>
                    <strong>{formatPercent(leader.percent)}%</strong>
                  </div>
                  <i>×</i>
                  <div>
                    <span>{runnerUp.name}</span>
                    <strong>{formatPercent(runnerUp.percent)}%</strong>
                  </div>
                </div>
              ) : null}

              <p className="method-note">
                Nas regiões, os percentuais são recalculados pela soma dos votos brutos das
                UFs. Não é feita média simples dos percentuais estaduais.
              </p>
            </aside>
          </section>

          <section className="regions-section">
            <div className="section-heading">
              <div>
                <span className="metric-label">BRASIL POR REGIÃO</span>
                <h2>Quem lidera em cada parte do país?</h2>
              </div>
              <p>Clique em uma região para abrir o detalhamento por estado.</p>
            </div>

            <div className="region-grid">
              {snapshot.regions.map((region) => (
                <RegionCard
                  key={region.region}
                  region={region}
                  active={scope === region.region}
                  onClick={() => setScope(region.region)}
                />
              ))}
            </div>
          </section>

          {activeRegion ? (
            <section className="states-section">
              <div className="section-heading">
                <div>
                  <span className="metric-label">DETALHE REGIONAL</span>
                  <h2>{REGIONS[activeRegion].name} por estado</h2>
                </div>
                <p>Selecione uma UF para ver o resultado presidencial daquele estado.</p>
              </div>

              <div className="state-grid">
                {visibleStates.map((state) => {
                  const stateLeader = state.candidates[0];
                  return (
                    <button
                      key={state.scope}
                      className={`state-card ${scope === state.scope ? "is-active" : ""}`}
                      onClick={() => setScope(state.scope)}
                    >
                      <div>
                        <strong>{state.scope}</strong>
                        <span>{state.name}</span>
                      </div>
                      <div className="state-result">
                        <strong>{stateLeader?.name ?? "—"}</strong>
                        <span>
                          {stateLeader ? `${formatPercent(stateLeader.percent)}%` : "—"} ·{" "}
                          {formatPercent(state.countedPercent)}% apurado
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <footer>
            <div>
              <strong>Fonte: Tribunal Superior Eleitoral</strong>
              <span>
                EA20 · Eleição Federal 6257 · dados consultados automaticamente a cada 10s
              </span>
            </div>
            <a
              href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados"
              target="_blank"
              rel="noreferrer"
            >
              Documentação oficial ↗
            </a>
          </footer>
        </>
      ) : null}
    </main>
  );
}
