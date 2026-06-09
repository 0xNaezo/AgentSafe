#!/usr/bin/env bash
set -Eeuo pipefail

# Bootstrap a Solana localnet demo token and fund the configured wallet.
# The script is designed to be run from the repository root:
#   bash scripts/setup_localnet.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/.env}"
WEB_ENV_FILE="${WEB_ENV_FILE:-${REPO_ROOT}/web/.env.local}"

cd "$REPO_ROOT"

log() {
  printf '\n==> %s\n' "$*"
}

note() {
  printf '    %s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  mkdir -p "$(dirname "$file")"
  touch "$file"

  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

expand_path() {
  local value="$1"

  case "$value" in
    "~")
      printf '%s\n' "$HOME"
      ;;
    "~/"*)
      printf '%s/%s\n' "$HOME" "${value#~/}"
      ;;
    /*)
      printf '%s\n' "$value"
      ;;
    *)
      printf '%s/%s\n' "$REPO_ROOT" "$value"
      ;;
  esac
}

require_command solana
require_command solana-keygen
require_command spl-token

if [[ ! -r "$ENV_FILE" ]]; then
  fail "Config file not found: ${ENV_FILE}. Create it with: cp .env.example .env"
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

PHANTOM_WALLET="${PHANTOM_WALLET:-}"
RPC_URL="${RPC_URL:-${NEXT_PUBLIC_SOLANA_RPC_URL:-http://localhost:8899}}"
AIRDROP_AMOUNT="${AIRDROP_AMOUNT:-100}"
MINT_AMOUNT="${MINT_AMOUNT:-1000000}"
MINT_KEYPAIR="${MINT_KEYPAIR:-fake_usdc_mint.json}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-6}"
FEE_PAYER="${FEE_PAYER:-$HOME/.config/solana/id.json}"
MINT_AUTHORITY_KEYPAIR="${MINT_AUTHORITY_KEYPAIR:-$FEE_PAYER}"

[[ -n "$PHANTOM_WALLET" ]] || fail "PHANTOM_WALLET is required in ${ENV_FILE}"
[[ "$PHANTOM_WALLET" != CHANGE_ME* ]] || fail "Replace PHANTOM_WALLET in ${ENV_FILE}"

MINT_KEYPAIR_PATH="$(expand_path "$MINT_KEYPAIR")"
FEE_PAYER_PATH="$(expand_path "$FEE_PAYER")"
MINT_AUTHORITY_KEYPAIR_PATH="$(expand_path "$MINT_AUTHORITY_KEYPAIR")"

[[ -f "$FEE_PAYER_PATH" ]] || fail "Fee payer keypair does not exist: ${FEE_PAYER_PATH}"
[[ -f "$MINT_AUTHORITY_KEYPAIR_PATH" ]] || fail "Mint authority keypair does not exist: ${MINT_AUTHORITY_KEYPAIR_PATH}"

MINT_AUTHORITY_ADDRESS="$(solana-keygen pubkey "$MINT_AUTHORITY_KEYPAIR_PATH")"

log "Resolved localnet configuration"
note "Environment file : ${ENV_FILE}"
note "RPC URL          : ${RPC_URL}"
note "Recipient wallet : ${PHANTOM_WALLET}"
note "Airdrop amount   : ${AIRDROP_AMOUNT} SOL"
note "Mint amount      : ${MINT_AMOUNT}"
note "Token decimals   : ${TOKEN_DECIMALS}"
note "Mint keypair     : ${MINT_KEYPAIR_PATH}"
note "Fee payer        : ${FEE_PAYER_PATH}"
note "Mint authority   : ${MINT_AUTHORITY_ADDRESS}"
note "Frontend env     : ${WEB_ENV_FILE}"

log "Checking localnet RPC"
solana cluster-version --url "$RPC_URL" >/dev/null || fail "Cannot reach Solana RPC at ${RPC_URL}. Start a local validator first."

log "Airdropping SOL"
solana airdrop "$AIRDROP_AMOUNT" --url "$RPC_URL"
solana airdrop "$AIRDROP_AMOUNT" "$PHANTOM_WALLET" --url "$RPC_URL"

if [[ ! -f "$MINT_KEYPAIR_PATH" ]]; then
  log "Generating mint keypair"
  mkdir -p "$(dirname "$MINT_KEYPAIR_PATH")"
  solana-keygen new \
    --no-bip39-passphrase \
    --silent \
    --outfile "$MINT_KEYPAIR_PATH" \
    >/dev/null
fi

MINT_ADDRESS="$(solana-keygen pubkey "$MINT_KEYPAIR_PATH")"

log "Preparing Fake USDC mint"
if solana account "$MINT_ADDRESS" --url "$RPC_URL" >/dev/null 2>&1; then
  note "Mint already exists: ${MINT_ADDRESS}"
else
  spl-token create-token "$MINT_KEYPAIR_PATH" \
    --decimals "$TOKEN_DECIMALS" \
    --mint-authority "$MINT_AUTHORITY_ADDRESS" \
    --fee-payer "$FEE_PAYER_PATH" \
    --url "$RPC_URL"
fi

log "Preparing recipient token account"
TOKEN_ACCOUNT="$(spl-token accounts "$MINT_ADDRESS" \
  --owner "$PHANTOM_WALLET" \
  --addresses-only \
  --url "$RPC_URL" \
  2>/dev/null | sed -n '1p')"

if [[ -n "$TOKEN_ACCOUNT" ]]; then
  note "Token account already exists: ${TOKEN_ACCOUNT}"
else
  spl-token create-account "$MINT_ADDRESS" \
    --owner "$PHANTOM_WALLET" \
    --fee-payer "$FEE_PAYER_PATH" \
    --url "$RPC_URL"

  TOKEN_ACCOUNT="$(spl-token accounts "$MINT_ADDRESS" \
    --owner "$PHANTOM_WALLET" \
    --addresses-only \
    --url "$RPC_URL" | sed -n '1p')"
fi

[[ -n "$TOKEN_ACCOUNT" ]] || fail "Could not resolve token account for ${PHANTOM_WALLET}"

log "Minting Fake USDC"
spl-token mint "$MINT_ADDRESS" "$MINT_AMOUNT" "$TOKEN_ACCOUNT" \
  --mint-authority "$MINT_AUTHORITY_KEYPAIR_PATH" \
  --fee-payer "$FEE_PAYER_PATH" \
  --url "$RPC_URL"

log "Updating frontend environment"
upsert_env_var "$WEB_ENV_FILE" "NEXT_PUBLIC_SOLANA_RPC_URL" "$RPC_URL"
upsert_env_var "$WEB_ENV_FILE" "NEXT_PUBLIC_DEMO_TOKEN_MINT" "$MINT_ADDRESS"
note "Updated ${WEB_ENV_FILE}"

log "Done"
note "Mint address       : ${MINT_ADDRESS}"
note "Token account      : ${TOKEN_ACCOUNT}"
note "Frontend RPC env   : NEXT_PUBLIC_SOLANA_RPC_URL=${RPC_URL}"
note "Frontend mint env  : NEXT_PUBLIC_DEMO_TOKEN_MINT=${MINT_ADDRESS}"
