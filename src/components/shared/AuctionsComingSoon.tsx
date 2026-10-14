/**
 * Shown on the home page when admin hides AuctionSwiper + AuctionsSection.
 */

export default function AuctionsComingSoon() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "85vh",
        background: "#09111a",
        padding: "120px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Soft radial atmosphere — matches auction house sections */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(201,169,110,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "min(720px, 90vw)",
          height: "min(720px, 90vw)",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: "1px solid rgba(201,169,110,0.08)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "min(480px, 70vw)",
          height: "min(480px, 70vw)",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: "1px solid rgba(201,169,110,0.06)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          maxWidth: 560,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Jost', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#c9a96e",
          }}
        >
          · Auction House ·
        </p>

        <h2
          style={{
            margin: 0,
            fontFamily: "'Jost', system-ui, sans-serif",
            fontSize: "clamp(42px, 8vw, 72px)",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "rgb(229,224,198)",
            letterSpacing: "-0.03em",
          }}
        >
          Coming Soon
        </h2>

        <div
          aria-hidden
          style={{
            width: 56,
            height: 2,
            borderRadius: 1,
            background:
              "linear-gradient(90deg, transparent, #c9a96e, transparent)",
          }}
        />

        <p
          style={{
            margin: 0,
            fontFamily: "'Jost', system-ui, sans-serif",
            fontSize: "clamp(15px, 2.2vw, 18px)",
            fontWeight: 400,
            lineHeight: 1.65,
            color: "rgba(229,224,198,0.55)",
          }}
        >
          New auctions are on the way. Check back soon.
        </p>
      </div>
    </section>
  );
}
