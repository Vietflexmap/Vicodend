#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo 'Run as root: sudo bash deploy/install.sh DOMAIN EMAIL'; exit 1; fi
DOMAIN="${1:?DOMAIN required}"; EMAIL="${2:?EMAIL required}"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || { echo 'Invalid domain'; exit 1; }
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx nodejs openssl
install -d -m 750 /opt/vicodend
install -d -o www-data -g www-data -m 750 /opt/vicodend/data
cp -R package.json src public /opt/vicodend/
chown -R root:root /opt/vicodend/package.json /opt/vicodend/src /opt/vicodend/public
SECRET="$(openssl rand -hex 32)"
cat > /opt/vicodend/.env <<EOF
PORT=3000
PUBLIC_ORIGIN=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN}
VICODE_SECRET=${SECRET}
TOKEN_TTL_SECONDS=300
EOF
chmod 600 /opt/vicodend/.env
sed "s/__DOMAIN__/${DOMAIN}/g" deploy/nginx.conf > /etc/nginx/sites-available/vicodend
ln -sfn /etc/nginx/sites-available/vicodend /etc/nginx/sites-enabled/vicodend
cp deploy/vicodend.service /etc/systemd/system/vicodend.service
nginx -t
systemctl daemon-reload; systemctl enable --now vicodend nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
echo "Installed: https://${DOMAIN}/health"
