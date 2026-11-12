/**
 * Fellas Admin logo, from Figma "Fellas Loaded App - Web Design" › Sidebar › Fellas Admin logo.
 * The SVG layers in public/brand/ are the original exports; positions are the Figma insets
 * (150 × 68.78 frame), so the logo scales cleanly to any width.
 */
const layer = "pointer-events-none absolute block max-w-none";

/* eslint-disable @next/next/no-img-element, @next/next/no-page-custom-font --
   small static SVG layers (next/image adds nothing) and an App Router font link hoisted by React. */

export function FellasLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span
      role="img"
      aria-label="Fellas Admin"
      className="@container relative block shrink-0"
      style={{ width: collapsed ? 44 : 120, aspectRatio: "150 / 68.784" }}
    >
      {/* Permanent Marker is the logo's own lettering for "ADMIN". */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" precedence="default" />
      <img alt="" src="/brand/fellas-wordmark.svg" className={layer} style={{ inset: "1.06% 2.03% 49.08% 4.74%" }} />
      <img alt="" src="/brand/admin-badge.svg" className={layer} style={{ inset: "45.78% 0.43% 0.94% 0.43%" }} />
      <img alt="" src="/brand/admin-badge-texture.svg" className={layer} style={{ inset: "46.48% 2.53% 0.93% 0.43%" }} />
      <img alt="" src="/brand/admin-badge-paper.svg" className={layer} style={{ inset: "45.77% 0.44% 1.17% 0.65%" }} />
      <span
        aria-hidden
        className="absolute flex items-center justify-center"
        style={{ left: "8.48%", top: "43.75%", width: "83.36%", height: "52.79%" }}
      >
        <span
          className="block leading-none whitespace-nowrap"
          style={{ fontFamily: '"Permanent Marker", cursive', fontSize: "21.43cqw", letterSpacing: "2.143cqw", color: "#1c191a", transform: "rotate(-2deg)" }}
        >
          ADMIN
        </span>
      </span>
    </span>
  );
}
