#!/usr/bin/env bash
# Install the operational scripts and systemd units onto the production server.
#
# Run it from a checkout, over WireGuard:
#   scp -r ops root@<server>:/tmp/ && ssh root@<server> 'bash /tmp/ops/install.sh'
#
# Idempotent. Existing files are backed up next to themselves before being
# replaced, so a bad deploy of these scripts is always recoverable.
set -euo pipefail

SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
STAMP=$(date -u +%Y%m%d-%H%M%S)

[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }

install_file() {
  local src=$1 dest=$2 mode=$3
  if [ -f "$dest" ] && ! cmp -s "$src" "$dest"; then
    cp -a "$dest" "$dest.bak-$STAMP"
    echo "  backed up $dest -> $dest.bak-$STAMP"
  fi
  install -m "$mode" -o root -g root "$src" "$dest"
  echo "  installed $dest (mode $mode)"
}

echo "scripts:"
for f in site-backup site-restore site-deploy site-rollback; do
  install_file "$SRC/bin/$f" "/usr/local/sbin/$f" 0700
done

echo "systemd units:"
for u in personal-website.service personal-website-backup.service personal-website-backup.timer; do
  install_file "$SRC/systemd/$u" "/etc/systemd/system/$u" 0644
done

systemctl daemon-reload
systemctl enable --now personal-website-backup.timer >/dev/null
systemctl enable personal-website.service >/dev/null

echo
echo "verify:"
for f in site-backup site-restore site-deploy site-rollback; do
  bash -n "/usr/local/sbin/$f" && echo "  $f syntax ok"
done
systemctl list-timers personal-website-backup.timer --no-pager | sed -n 2p
