/**
 * Fellas Admin logo, from Figma "Fellas Loaded App - Web Design" › Sidebar › Fellas Admin logo.
 * The SVG layers in public/brand/ are the original exports; positions are the Figma insets
 * (150 × 68.78 frame), so the logo scales cleanly to any width.
 */
import localFont from "next/font/local";

/** Permanent Marker (Apache 2.0, see fonts/LICENSE.txt), self-hosted: no request to Google. */
const marker = localFont({
  src: "./fonts/PermanentMarker-Regular.woff2",
  weight: "400",
  display: "swap",
  fallback: ["cursive"],
});

// Same structure as Figma's export: each layer box is positioned by its inset, and the image fills it.
const layer = "pointer-events-none absolute inset-0 block size-full max-w-none";

const LAYERS: Array<[src: string, inset: string]> = [
  ["/brand/fellas-wordmark.svg", "1.06% 2.03% 49.08% 4.74%"],
  ["/brand/admin-badge.svg", "45.78% 0.43% 0.94% 0.43%"],
  ["/brand/admin-badge-texture.svg", "46.48% 2.53% 0.93% 0.43%"],
  ["/brand/admin-badge-paper.svg", "45.77% 0.44% 1.17% 0.65%"],
];

/* eslint-disable @next/next/no-img-element -- small static SVG layers; next/image adds nothing. */

export function FellasLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span
      role="img"
      aria-label="Fellas Admin"
      className="@container relative block shrink-0"
      style={{ width: collapsed ? 44 : 120, aspectRatio: "150 / 68.784" }}
    >
      {LAYERS.map(([src, inset]) => (
        <span key={src} className="absolute" style={{ inset }}>
          <img alt="" src={src} className={layer} />
        </span>
      ))}
      <span
        aria-hidden
        className="absolute flex items-center justify-center"
        style={{ left: "8.48%", top: "43.75%", width: "83.36%", height: "52.79%" }}
      >
        <span
          className={`${marker.className} block leading-none whitespace-nowrap`}
          style={{ fontSize: "21.43cqw", letterSpacing: "2.143cqw", color: "#1c191a", transform: "rotate(-2deg)" }}
        >
          ADMIN
        </span>
      </span>
    </span>
  );
}
