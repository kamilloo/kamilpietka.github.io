#!/usr/bin/env bash
set -eu

sudo apt-get update
sudo apt-get install -y rsync openssh-client

mkdir -p /tmp/portfolio-ssh

printf '%s\n' "$VPS_SSH_KEY" > /tmp/portfolio-ssh/id_ed25519
chmod 600 /tmp/portfolio-ssh/id_ed25519

ssh-keyscan -H "$VPS_HOST" > /tmp/portfolio-ssh/known_hosts

rsync -avz --delete \
  -e "ssh -i /tmp/portfolio-ssh/id_ed25519 -o UserKnownHostsFile=/tmp/portfolio-ssh/known_hosts" \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'README.md' \
  --exclude '.gitignore' \
  --exclude 'deploy.sh' \
  ./ \
  "$VPS_USER@$VPS_HOST:/opt/portfolio/site/"