#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/portfolio-ssh

printf '%s\n' "$VPS_SSH_KEY" > /tmp/portfolio-ssh/id_ed25519
chmod 600 /tmp/portfolio-ssh/id_ed25519

ssh-keyscan -H "$VPS_HOST" > /tmp/portfolio-ssh/known_hosts

SSH_OPTS=(
  -i /tmp/portfolio-ssh/id_ed25519
  -o UserKnownHostsFile=/tmp/portfolio-ssh/known_hosts
  -o StrictHostKeyChecking=yes
)

ssh "${SSH_OPTS[@]}" \
  "$VPS_USER@$VPS_HOST" \
  "rm -f /opt/portfolio/site/index.html /opt/portfolio/site/styles.css"

scp "${SSH_OPTS[@]}" \
  index.html \
  styles.css \
  "$VPS_USER@$VPS_HOST:/opt/portfolio/site/"