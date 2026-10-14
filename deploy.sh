#!/usr/bin/env bash
set -eux

apt-get update
apt-get install -y rsync

command -v rsync
rsync --version