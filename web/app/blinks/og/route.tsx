import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const WIDTH = 800;
const HEIGHT = 418;

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)} ··· ${address.slice(-chars)}`;
}

function generateIdenticonColors(address: string) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 80)) % 360;
  const angle = Math.abs((hash >> 16) % 360);

  return { hue1, hue2, angle };
}

function formatUiAmount(raw: string): string {
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWholeNumber(raw: string): string {
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString("en-US");
}

// ── Policy check types ───────────────────────────────────────────────────────

type PolicyStatus = "pass" | "warn";

type PolicyCheckItem = {
  label: string;
  value: string;
  status: PolicyStatus;
};

function buildPolicyChecks(params: {
  amount: number;
  dailyLimit: number;
  dailyUsed: number;
  onetimeLimit: number;
}): PolicyCheckItem[] {
  const { amount, dailyLimit, dailyUsed, onetimeLimit } = params;
  const checks: PolicyCheckItem[] = [];

  if (dailyLimit > 0) {
    const remaining = Math.max(0, dailyLimit - dailyUsed);
    const withinDaily = amount <= remaining;
    checks.push({
      label: "Within daily limit",
      value: withinDaily
        ? `${formatWholeNumber(String(remaining))} of ${formatWholeNumber(String(dailyLimit))} left`
        : `Exceeds by ${formatWholeNumber(String(Math.ceil(amount - remaining)))}`,
      status: withinDaily ? "pass" : "warn",
    });
  }

  if (onetimeLimit > 0) {
    const withinCap = amount <= onetimeLimit;
    checks.push({
      label: withinCap ? "Within per-payment cap" : "Above per-payment cap",
      value: `Cap ${formatWholeNumber(String(onetimeLimit))} USDC`,
      status: withinCap ? "pass" : "warn",
    });
  }

  return checks;
}

// ── Fonts ────────────────────────────────────────────────────────────────────

async function loadFonts(origin: string) {
  const [geistData, plexMonoData] = await Promise.all([
    fetch(new URL("/Geist-Regular.ttf", origin)).then((r) => r.arrayBuffer()),
    fetch(new URL("/IBMPlexMono-SemiBold.ttf", origin)).then((r) =>
      r.arrayBuffer(),
    ),
  ]);

  return [
    { name: "Geist", data: geistData, style: "normal" as const, weight: 400 as const },
    { name: "IBM Plex Mono", data: plexMonoData, style: "normal" as const, weight: 600 as const },
  ];
}

// ── SVG icons ────────────────────────────────────────────────────────────────

function CheckCircle() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16a34a"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function AlertCircle() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d97706"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url);

    const amountRaw = searchParams.get("amount") ?? "0";
    const to = searchParams.get("to") ?? "";
    const dailyLimit = Number(searchParams.get("dailyLimit") ?? "0");
    const dailyUsed = Number(searchParams.get("dailyUsed") ?? "0");
    const onetimeLimit = Number(searchParams.get("onetimeLimit") ?? "0");

    const amount = Number(amountRaw);
    const displayAmount = formatUiAmount(amountRaw);
    const truncatedAddr = truncateAddress(to);
    const identicon = generateIdenticonColors(to);

    const checks = buildPolicyChecks({ amount, dailyLimit, dailyUsed, onetimeLimit });
    const hasChecks = checks.length > 0;

    const fonts = await loadFonts(origin);

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            fontFamily: "Geist",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 28px",
              borderBottom: "1px solid #e4e4e7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "linear-gradient(135deg, #0d0d0d, #27272a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldIcon />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  color: "#71717a",
                  letterSpacing: "0.08em",
                }}
              >
                SOLANA ACTION
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "#a1a1aa",
                fontFamily: "IBM Plex Mono",
                fontWeight: 600,
              }}
            >
              agentsafe.app
            </span>
          </div>

          {/* ── Payment Request ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: hasChecks ? "24px 28px 20px" : "32px 28px 28px",
              flexGrow: hasChecks ? 0 : 1,
            }}
          >
            <span style={{ fontSize: 13, color: "#71717a", marginBottom: 8 }}>
              Payment request
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontSize: 44,
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  color: "#09090b",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {displayAmount}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: "#2775ca",
                  }}
                />
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#52525b",
                    fontFamily: "IBM Plex Mono",
                  }}
                >
                  USDC
                </span>
              </div>
            </div>

            {/* ── Recipient ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <span style={{ fontSize: 14, color: "#71717a" }}>Recipient</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#fafafa",
                  borderRadius: 8,
                  padding: "6px 14px",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `linear-gradient(${identicon.angle}deg, hsl(${identicon.hue1}, 70%, 55%), hsl(${identicon.hue2}, 65%, 50%))`,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "IBM Plex Mono",
                    fontWeight: 600,
                    color: "#27272a",
                  }}
                >
                  {truncatedAddr}
                </span>
              </div>
            </div>
          </div>

          {/* ── Policy Checks ── */}
          {hasChecks && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid #e4e4e7",
                padding: "16px 28px 22px",
                flexGrow: 1,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  color: "#a1a1aa",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                POLICY CHECK
              </span>

              {checks.map((check, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {check.status === "pass" ? <CheckCircle /> : <AlertCircle />}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#27272a",
                      }}
                    >
                      {check.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "IBM Plex Mono",
                      fontWeight: 600,
                      color: "#a1a1aa",
                    }}
                  >
                    {check.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      },
    );
  } catch (error) {
    console.error("OG image generation failed:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
