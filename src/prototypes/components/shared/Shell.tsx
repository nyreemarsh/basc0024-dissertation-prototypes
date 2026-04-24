import type { ReactNode } from "react";
import { colors, space } from "../../tokens";

interface ShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

/**
 * Shell — full-page frame containing main content slot and optional right panel.
 * Used identically across all four prototypes. Prototype B/C/D inject rightPanel.
 */
export function Shell({ children, rightPanel }: ShellProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: colors.bg.canvas,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Main content area */}
      <main
        style={{
          flex: rightPanel ? "0 0 66%" : "1",
          padding: space[6],
          overflowY: "auto",
        }}
      >
        {children}
      </main>

      {/* Right panel slot (Prototype B/C/D only) */}
      {rightPanel && (
        <aside
          id="explanation-panel"
          style={{
            flex: "0 0 34%",
            backgroundColor: colors.bg.surface,
            borderLeft: `1px solid ${colors.border.default}`,
            padding: space[6],
            overflowY: "auto",
            scrollMarginTop: space[6],
          }}
        >
          {rightPanel}
        </aside>
      )}
    </div>
  );
}