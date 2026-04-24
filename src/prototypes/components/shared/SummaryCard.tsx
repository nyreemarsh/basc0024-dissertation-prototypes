import { useState } from "react";
import { colors, fonts, space, radius } from "../../tokens";

interface SummaryCardProps {
  text: string;
  costText?: string; // Optional daily cost estimate line
  forecastAccuracy?: string; // Optional forecast accuracy line (DR9 for C/D)
  onExplainClick?: () => void; // Optional callback to open explanation panel
  showModifyButton?: boolean; // Show "Modify schedule" button (DR5)
  expandableExplanation?: React.ReactNode; // Optional expandable explanation content (DR8)
}

/**
 * SummaryCard — full-width plain-language summary below the header.
 * Text content changes per prototype (A: factual only, B/C/D: adds context).
 * Shared visual foundation component.
 *
 * Optional explain button (B/C/D) triggers side panel focus.
 * Optional costText shows daily cost estimate (DR2 information hierarchy).
 * Optional modify schedule button (DR5).
 * Optional expandable explanation (DR8 for Prototype B).
 */
export function SummaryCard({ text, costText, forecastAccuracy, onExplainClick, showModifyButton, expandableExplanation }: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExplainClick = () => {
    if (expandableExplanation) {
      setIsExpanded(!isExpanded);
    } else if (onExplainClick) {
      onExplainClick();
    }
  };
  // Helper to render cost text with bold numbers (£ and kg values)
  const renderCostText = (cost: string) => {
    // Split by £ and kg to find numbers and make them bold
    const parts = cost.split(/(£\d+\.\d+|\d+\.\d+\s*kg)/);
    return parts.map((part, i) => {
      if (part.match(/£\d+\.\d+|\d+\.\d+\s*kg/)) {
        return <span key={i} style={{ fontWeight: fonts.weight.semibold }}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        backgroundColor: colors.bg.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.lg,
        padding: space[4],
        marginBottom: space[6],
      }}
    >
      <p
        style={{
          fontFamily: fonts.family.sans,
          fontSize: fonts.size.body,
          color: colors.text.primary,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {text}
      </p>

      {costText && (
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: 14,
            color: "#6B7280",
            fontWeight: fonts.weight.regular,
            lineHeight: 1.65,
            margin: 0,
            marginTop: 8,
          }}
        >
          {renderCostText(costText)}
        </p>
      )}

      {forecastAccuracy && (
        <p
          style={{
            fontFamily: fonts.family.sans,
            fontSize: 13,
            color: "#9CA3AF",
            fontWeight: fonts.weight.regular,
            lineHeight: 1.65,
            margin: 0,
            marginTop: 6,
          }}
        >
          {(() => {
            // Extract percentage and make it semibold #6B7280
            const parts = forecastAccuracy.split(/(\d+%)/);
            return parts.map((part, i) => {
              if (part.match(/\d+%/)) {
                return <span key={i} style={{ fontWeight: fonts.weight.semibold, color: "#6B7280" }}>{part}</span>;
              }
              return <span key={i}>{part}</span>;
            });
          })()}
        </p>
      )}

      {showModifyButton && (
        <button
          style={{
            marginTop: 12,
            background: "none",
            border: "1px solid #F59E0B",
            borderRadius: 6,
            padding: "8px 16px",
            fontFamily: fonts.family.sans,
            fontSize: 13,
            color: "#F59E0B",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Modify schedule
          <span>→</span>
        </button>
      )}

      {(onExplainClick || expandableExplanation) && (
        <>
          <button
            onClick={handleExplainClick}
            style={{
              marginTop: space[3],
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: fonts.family.sans,
              fontSize: 14,
              fontWeight: fonts.weight.semibold,
              color: "#1C1C1E",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            <span>Why did EnergyView make that choice?</span>
            <span style={{ fontSize: 18 }}>{expandableExplanation && isExpanded ? "▾" : "▸"}</span>
          </button>

          {expandableExplanation && isExpanded && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid #E5E7EB`,
              }}
            >
              {expandableExplanation}
            </div>
          )}
        </>
      )}
    </div>
  );
}