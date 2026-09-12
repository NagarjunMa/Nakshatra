import { ImageResponse } from "next/og";

export const alt = "Nakshatra — One introduction. On your terms.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "68px",
          background: "#f8f6f0",
          color: "#162a33",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid #d9d7ce",
            borderRadius: "28px",
            padding: "52px 58px",
            background: "#fffdf8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "0.18em" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", border: "2px solid #a86708", borderRadius: "50%", color: "#a86708", fontSize: 24, letterSpacing: 0 }}>N</span>
              NAKSHATRA
            </div>
            <div style={{ display: "flex", border: "1px solid #8db7b1", borderRadius: "999px", padding: "10px 18px", background: "#e5efeb", color: "#174b55", fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700 }}>
              INVITE-ONLY PRIVATE BETA
            </div>
          </div>

          <div style={{ display: "flex", maxWidth: "930px", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, lineHeight: 1.02, letterSpacing: "-0.04em" }}>
              One introduction. On your terms.
            </div>
            <div style={{ display: "flex", maxWidth: "870px", marginTop: "28px", color: "#52666d", fontFamily: "Arial, sans-serif", fontSize: 27, lineHeight: 1.45 }}>
              A private wedding biodata portfolio with one current link and protected details shared only after approval.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#246d75", fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 700 }}>
            <span>First View</span><span>→</span><span>Verified interest</span><span>→</span><span>Approved Full View</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
