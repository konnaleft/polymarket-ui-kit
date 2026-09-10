import {
  clampProbability,
  escapeCssUrl,
  formatCompactNumber,
  probabilityToCents,
  resolveBackgroundImage,
  type PolymarketMarket,
} from "@polymarket-ui-kit/core";
import { cx } from "./shared";

export interface ShareCardProps {
  market: PolymarketMarket;
  className?: string;
  attribution?: string;
  /**
   * Photo override (Milei, etc.). Defaults to the market's own
   * Gamma image/icon. Photo cards render with the dark treatment.
   */
  backgroundImage?: string;
  /** "right center" keeps the face on the right, like the reference card. */
  backgroundPosition?: string;
}

export function ShareCard({
  market,
  className,
  attribution = "polymarket-ui-kit",
  backgroundImage,
  backgroundPosition = "right center",
}: ShareCardProps) {
  const photo = resolveBackgroundImage(market, backgroundImage);
  const leadingOutcome = market.outcomes[0];
  const probability = leadingOutcome
    ? clampProbability(leadingOutcome.price ?? 0)
    : 0;
  const probabilityWidth = `${Math.round(probability * 100)}%`;
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
        photo && "pui-share-card--photo",
        className,
      )}
      style={
        photo
          ? {
              backgroundImage: `
                linear-gradient(
                  90deg,
                  rgba(8, 18, 40, 0.94) 38%,
                  rgba(8, 18, 40, 0.55) 68%,
                  rgba(8, 18, 40, 0.28) 100%
                ),
                url("${escapeCssUrl(photo)}")
              `,
              backgroundSize: "cover",
              backgroundPosition,
            }
          : undefined
      }
    >
      <div className="pui-share-card__topline">
        <div className="pui-row">
          <span className="pui-share-card__brand">Polymarket Trend</span>
        </div>
        <span className="pui-share-card__attribution">{attribution}</span>
      </div>

      <div className="pui-share-card__body">
        <div className="pui-share-card__market">
          <span className="pui-share-card__label">
            {market.category ?? "Prediction market"}
          </span>
          <h2>{market.question}</h2>
        </div>

        {leadingOutcome ? (
          <div className="pui-share-card__quote">
            <div>
              <span className="pui-share-card__label">Leading outcome</span>
              <strong>{leadingOutcome.name}</strong>
            </div>
            <div className="pui-share-card__price">
              {probabilityToCents(leadingOutcome.price)}
            </div>
            <div className="pui-share-card__bar" aria-hidden="true">
              <span style={{ width: probabilityWidth }} />
            </div>
          </div>
        ) : null}
      </div>

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
    </article>
  );
}