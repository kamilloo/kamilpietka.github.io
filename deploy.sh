#!/usr/bin/env bash
set -euo pipefail

: "${VPS_HOST:?VPS_HOST is not configured}"
: "${VPS_USER:?VPS_USER is not configured}"
: "${VPS_SSH_KEY_B64:?VPS_SSH_KEY_B64 is not configured}"

mkdir -p /tmp/portfolio-ssh

printf '%s' "$VPS_SSH_KEY_B64" | base64 -d \
  > /tmp/portfolio-ssh/id_ed25519

chmod 600 /tmp/portfolio-ssh/id_ed25519

ssh-keyscan -H "$VPS_HOST" \
  > /tmp/portfolio-ssh/known_hosts

SSH_OPTS=(
  -i /tmp/portfolio-ssh/id_ed25519
  -o UserKnownHostsFile=/tmp/portfolio-ssh/known_hosts
  -o StrictHostKeyChecking=yes
  -o BatchMode=yes
)

ssh "${SSH_OPTS[@]}" \
  "$VPS_USER@$VPS_HOST" \
  "rm -rf /opt/portfolio/site/*"

scp "${SSH_OPTS[@]}" -r \
  public/. \
  "$VPS_USER@$VPS_HOST:/opt/portfolio/site/"