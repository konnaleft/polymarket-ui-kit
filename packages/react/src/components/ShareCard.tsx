import {
  clampProbability,
  formatCents,
  formatCompactNumber,
  looksLikeCutout,
  resolveBackgroundImage,
  resolveCardVisual,
  resolveMarketCategory,
  type CardVisualMode,
  type PolymarketMarket,
} from "@polymarket-ui-kit/core";
import { cx } from "./shared";

export interface ShareCardProps {
  market: PolymarketMarket;
  className?: string;
  /**
   * @deprecated The Trend card shows the market category in the topline;
   * this prop is accepted for backward compatibility but no longer rendered.
   */
  attribution?: string;
  /**
   * Visual treatment: "auto" (default) picks subject for cutout-named
   * images, scene for rectangular photos, none without image.
   * Rectangular photos in subject mode blend with a fade (option B).
   */
  visual?: CardVisualMode | undefined;
  /**
   * Photo override (Milei, etc.). Defaults to the market's own
   * Gamma image/icon.
   */
  backgroundImage?: string;
  /** Object position for scene photos. Defaults to "center right". */
  backgroundPosition?: string;
}

export function ShareCard({
  market,
  className,
  visual: visualMode = "auto",
  backgroundImage,
  backgroundPosition = "center right",
}: ShareCardProps) {
  const photo = resolveBackgroundImage(market, backgroundImage);
  const visual = resolveCardVisual(photo, visualMode);
  // Rectangular photo forced into subject mode: blend with a fade
  // instead of pretending to be a transparent cutout.
  const subjectFade =
    visual.kind === "subject" && visual.src && !looksLikeCutout(visual.src);
  const leadingOutcome = market.outcomes[0];
  const probability = leadingOutcome
    ? clampProbability(leadingOutcome.price ?? 0)
    : 0;
  const probabilityWidth = `${Math.round(probability * 100)}%`;
  const category = resolveMarketCategory(market);
  const stats = [
    market.volume
      ? { label: "Volume", value: formatCompactNumber(market.volume) }
      : null,
    market.liquidity
      ? { label: "Liquidity", value: formatCompactNumber(market.liquidity) }
      : null,
    market.commentCount
      ? { label: "Comments", value: formatCompactNumber(market.commentCount) }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <article
      className={cx(
        "pui-card pui-share-card",
        visual.kind !== "none" && "pui-share-card--photo",
        `pui-share-card--${visual.kind}`,
        className,
      )}
    >
      {visual.kind === "scene" && visual.src ? (
        <img
          className="pui-share-card__scene"
          src={visual.src}
          alt=""
          style={{ objectPosition: backgroundPosition }}
        />
      ) : null}
      {visual.kind === "subject" && visual.src ? (
        <img
          className="pui-share-card__subject"
          src={visual.src}
          alt=""
        />
      ) : null}
      {visual.kind !== "none" ? (
        <div className="pui-share-card__scrim" aria-hidden="true" />
      ) : null}
      {subjectFade ? (
        <div className="pui-share-card__subject-fade" aria-hidden="true" />
      ) : null}

      <div className="pui-share-card__content">
        <div className="pui-share-card__topline">
          <span className="pui-share-card__brand">Polymarket Trend</span>
          <span className="pui-share-card__category">{category}</span>
        </div>

        <p className="pui-share-card__eyebrow">{category}</p>
        <h2 className="pui-share-card__title">{market.question}</h2>

        {leadingOutcome ? (
          <div className="pui-share-card__quote">
            <span className="pui-share-card__label">Leading outcome</span>
            <div className="pui-share-card__quote-row">
              <strong>{leadingOutcome.name}</strong>
              <span className="pui-share-card__price">
                {formatCents(leadingOutcome.price)}
              </span>
            </div>
            <div className="pui-share-card__bar" aria-hidden="true">
              <span style={{ width: probabilityWidth }} />
            </div>
          </div>
        ) : null}

        <dl className="pui-share-card__stats">
          {stats.length ? (
            stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt>Status</dt>
              <dd>{market.status}</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}
