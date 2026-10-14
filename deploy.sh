#!/usr/bin/env bash
set -eu

echo "User:"
whoami

echo "SSH:"
command -v ssh || true

echo "rsync:"
command -v rsync || true

echo "apt:"
command -v apt-get || true

echo "Environment ready"