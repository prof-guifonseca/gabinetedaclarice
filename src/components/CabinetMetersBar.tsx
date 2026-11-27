import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Flame,
  Scale,
  ShoppingBag,
} from "lucide-react";
import type {
  CabinetMeters,
  DramaticAct,
  ScenarioId,
} from "../shared/gameState";
import { SCENARIOS } from "../shared/scenarios";

interface CabinetMetersBarProps {
  scenarioId: ScenarioId;
  act: DramaticAct;
  meters: CabinetMeters;
  lastDeltas: Partial<CabinetMeters> | null;
}

const ACT_LABELS: Record<DramaticAct, string> = {
  1: "ATO I · CHAZINHO & RING LIGHT",
  2: "ATO II · CORTE PRO REELS",
  3: "ATO III · GUERRA CULTURAL",
};

const ACT_SHORT: Record<DramaticAct, string> = {
  1: "ATO I",
  2: "ATO II",
  3: "ATO III",
};

function formatDelta(value: number | undefined, suffix = ""): string | null {
  if (!value) return null;
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

export function CabinetMetersBar({
  scenarioId,
  act,
  meters,
  lastDeltas,
}: CabinetMetersBarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.livre;
  const paradoxDanger = meters.paradoxoTradwife >= 65;
  const lowCompostura = meters.compostura <= 30;

  const deltaCortes = formatDelta(lastDeltas?.cortesVirais, "%");
  const deltaParadoxo = formatDelta(lastDeltas?.paradoxoTradwife, "%");
  const deltaHotmart = formatDelta(lastDeltas?.faturamentoHotmartK, "k");
  const deltaCompostura = formatDelta(lastDeltas?.compostura, "%");

  return (
    <section
      className={`meters-strip ${mobileExpanded ? "is-mobile-expanded" : ""}`}
      aria-label="Painel da Guerra Cultural do Gabinete 222"
    >
      {/* Mobile ultra-compact single-line summary bar */}
      <div className="mobile-meters-compact">
        <span className={`act-chip is-act-${act}`}>{ACT_SHORT[act]}</span>
        <div className="mobile-meters-inline">
          <span className="mini-stat is-gold" title="Cortes Virais">
            <Clapperboard size={11} /> {meters.cortesVirais}%
          </span>
          <span className="mini-stat is-danger" title="Paradoxo Tradwife">
            <Scale size={11} /> {meters.paradoxoTradwife}%
          </span>
          <span className="mini-stat is-emerald" title="Faturamento Hotmart">
            <ShoppingBag size={11} /> R${meters.faturamentoHotmartK}k
          </span>
          <span
            className={`mini-stat ${lowCompostura ? "is-danger" : "is-warm"}`}
            title="Compostura"
          >
            <Flame size={11} /> {meters.compostura}%
          </span>
        </div>
        <button
          type="button"
          className="mobile-meters-toggle"
          onClick={() => setMobileExpanded((v) => !v)}
          aria-expanded={mobileExpanded}
          aria-label={
            mobileExpanded
              ? "Recolher medidores"
              : "Expandir medidores e meta"
          }
        >
          {mobileExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Full desktop bar (and expandable drawer on mobile) */}
      <div className="meters-full-body">
        <div className="meters-top-row">
          <span className={`act-chip is-act-${act}`}>{ACT_LABELS[act]}</span>
          <span className="mission-objective-line">
            <strong>{scenario.badge}:</strong> {scenario.objective}
          </span>
        </div>

        <div className="meters-grid">
          <div className="meter-cell">
            <div className="meter-label-row">
              <span className="meter-label">
                <Clapperboard size={13} />
                Cortes
              </span>
              <span className="meter-value is-gold">
                {meters.cortesVirais}%
                {deltaCortes && (
                  <em
                    className={`delta-badge ${
                      (lastDeltas?.cortesVirais ?? 0) > 0 ? "is-pos" : "is-neg"
                    }`}
                  >
                    {deltaCortes}
                  </em>
                )}
              </span>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill is-gold"
                style={{ width: `${meters.cortesVirais}%` }}
              />
            </div>
          </div>

          <div className={`meter-cell ${paradoxDanger ? "is-alert" : ""}`}>
            <div className="meter-label-row">
              <span className="meter-label">
                <Scale size={13} />
                Paradoxo
              </span>
              <span className="meter-value is-danger">
                {meters.paradoxoTradwife}%
                {deltaParadoxo && (
                  <em
                    className={`delta-badge ${
                      (lastDeltas?.paradoxoTradwife ?? 0) > 0
                        ? "is-neg"
                        : "is-pos"
                    }`}
                  >
                    {deltaParadoxo}
                  </em>
                )}
              </span>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill is-danger"
                style={{ width: `${meters.paradoxoTradwife}%` }}
              />
            </div>
          </div>

          <div className="meter-cell">
            <div className="meter-label-row">
              <span className="meter-label">
                <ShoppingBag size={13} />
                Hotmart
              </span>
              <span className="meter-value is-emerald">
                R$&nbsp;{meters.faturamentoHotmartK}k
                {deltaHotmart && (
                  <em className="delta-badge is-pos">{deltaHotmart}</em>
                )}
              </span>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill is-emerald"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((meters.faturamentoHotmartK / 250) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className={`meter-cell ${lowCompostura ? "is-alert" : ""}`}>
            <div className="meter-label-row">
              <span className="meter-label">
                {lowCompostura ? (
                  <AlertTriangle size={13} />
                ) : (
                  <Flame size={13} />
                )}
                Compostura
              </span>
              <span
                className={`meter-value ${
                  lowCompostura ? "is-danger" : "is-warm"
                }`}
              >
                {meters.compostura}%
                {deltaCompostura && (
                  <em
                    className={`delta-badge ${
                      (lastDeltas?.compostura ?? 0) > 0 ? "is-pos" : "is-neg"
                    }`}
                  >
                    {deltaCompostura}
                  </em>
                )}
              </span>
            </div>
            <div className="meter-track">
              <div
                className={`meter-fill ${
                  lowCompostura ? "is-danger" : "is-warm"
                }`}
                style={{ width: `${meters.compostura}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
