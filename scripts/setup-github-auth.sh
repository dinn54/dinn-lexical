#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_FILE="$ROOT_DIR/.github-auth.local"
CREDENTIALS_FILE="$ROOT_DIR/.github-credentials"

if [[ ! -f "$AUTH_FILE" ]]; then
  echo "Missing $AUTH_FILE"
  echo "Copy .github-auth.local.example to .github-auth.local and fill it in."
  exit 1
fi

# shellcheck disable=SC1090
source "$AUTH_FILE"

required_vars=(
  GIT_USER_NAME
  GIT_USER_EMAIL
  GITHUB_USERNAME
  GITHUB_TOKEN
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing value for $var_name in $AUTH_FILE"
    exit 1
  fi
done

git -C "$ROOT_DIR" config user.name "$GIT_USER_NAME"
git -C "$ROOT_DIR" config user.email "$GIT_USER_EMAIL"
git -C "$ROOT_DIR" config credential.helper "store --file=$CREDENTIALS_FILE"

cat > "$CREDENTIALS_FILE" <<EOF
https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com
EOF

chmod 600 "$CREDENTIALS_FILE"

echo "Configured local git identity and GitHub credential helper for $ROOT_DIR"
