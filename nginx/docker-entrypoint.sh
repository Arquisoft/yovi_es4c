#!/bin/sh
# nginx/docker-entrypoint.sh
#
# Entrypoint personalizado para el contenedor nginx.
# 1. Genera el certificado autofirmado si no existe (o si ha cambiado el DOMAIN)
# 2. Procesa app.conf.template → app.conf sustituyendo $DOMAIN
# 3. Arranca nginx normalmente

set -e

DOMAIN="${DOMAIN:-localhost}"
CERT_DIR="/etc/nginx/certs"
CERT="$CERT_DIR/cert.pem"
KEY="$CERT_DIR/key.pem"
TEMPLATE="/etc/nginx/templates/app.conf.template"
CONF="/etc/nginx/conf.d/app.conf"

# ── 1. Generar certificado si no existe o si el CN no coincide con DOMAIN ────
NEEDS_CERT=true
if [ -f "$CERT" ]; then
    CURRENT_CN=$(openssl x509 -in "$CERT" -noout -subject 2>/dev/null | sed 's/.*CN = //' | tr -d ' ')
    if [ "$CURRENT_CN" = "$DOMAIN" ]; then
        NEEDS_CERT=false
    fi
fi

if [ "$NEEDS_CERT" = "true" ]; then
    mkdir -p "$CERT_DIR"

    if echo "$DOMAIN" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
        SAN="IP:$DOMAIN"
    else
        SAN="DNS:$DOMAIN"
    fi

    echo "[entrypoint] Generando certificado para $DOMAIN (SAN=$SAN)"
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY" -out "$CERT" \
        -days 3650 -nodes \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=$SAN"
fi

# ── 2. Procesar el template ───────────────────────────────────────────────────
echo "[entrypoint] Generando $CONF desde template (DOMAIN=$DOMAIN)"
export DOMAIN
envsubst '${DOMAIN}' < "$TEMPLATE" > "$CONF"

# ── 3. Arrancar nginx ─────────────────────────────────────────────────────────
echo "[entrypoint] Arrancando nginx..."
exec nginx -g "daemon off;"
