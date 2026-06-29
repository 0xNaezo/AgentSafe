import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const WIDTH = 800;
const HEIGHT = 380;

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
  hourlyLimit: number;
  hourlyUsed: number;
  onetimeLimit: number;
}): PolicyCheckItem[] {
  const { amount, dailyLimit, dailyUsed, hourlyLimit, hourlyUsed, onetimeLimit } = params;
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

  if (hourlyLimit > 0) {
    const remaining = Math.max(0, hourlyLimit - hourlyUsed);
    const withinHourly = amount <= remaining;
    checks.push({
      label: "Within hourly limit",
      value: withinHourly
        ? `${formatWholeNumber(String(remaining))} of ${formatWholeNumber(String(hourlyLimit))} left`
        : `Exceeds by ${formatWholeNumber(String(Math.ceil(amount - remaining)))}`,
      status: withinHourly ? "pass" : "warn",
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
      width="28"
      height="28"
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
      width="28"
      height="28"
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

function UsdcLogo() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 2000 2000"
    >
      <path
        d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z"
        fill="#2775ca"
      />
      <path
        d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z"
        fill="#fff"
      />
      <path
        d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z"
        fill="#fff"
      />
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
    const hourlyLimit = Number(searchParams.get("hourlyLimit") ?? "0");
    const hourlyUsed = Number(searchParams.get("hourlyUsed") ?? "0");
    const onetimeLimit = Number(searchParams.get("onetimeLimit") ?? "0");

    const amount = Number(amountRaw);
    const displayAmount = formatUiAmount(amountRaw);
    const truncatedAddr = truncateAddress(to);
    const identicon = generateIdenticonColors(to);

    const checks = buildPolicyChecks({ amount, dailyLimit, dailyUsed, hourlyLimit, hourlyUsed, onetimeLimit });
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
            padding: "20px 24px",
            justifyContent: "center",
          }}
        >
          {/* ── Payment Request ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: 20, color: "#a1a1aa", marginBottom: 4 }}>
              Payment request
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 18,
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  color: "#09090b",
                  lineHeight: 1,
                  letterSpacing: "-2px",
                }}
              >
                {displayAmount}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8 }}>
                <UsdcLogo />
                <span
                  style={{
                    fontSize: 36,
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
                marginTop: 16,
              }}
            >
              <span style={{ fontSize: 20, color: "#a1a1aa" }}>Recipient</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "#fafafa",
                  borderRadius: 10,
                  padding: "8px 14px",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: `linear-gradient(${identicon.angle}deg, hsl(${identicon.hue1}, 70%, 55%), hsl(${identicon.hue2}, 65%, 50%))`,
                  }}
                />
                <span
                  style={{
                    fontSize: 20,
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
                paddingTop: 14,
                marginTop: 16,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  color: "#a1a1aa",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {check.status === "pass" ? <CheckCircle /> : <AlertCircle />}
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#27272a",
                      }}
                    >
                      {check.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 20,
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
