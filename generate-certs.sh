#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-certs.sh
#
# Genera un certificado autofirmado para localhost.
# Ejecutar UNA SOLA VEZ antes de arrancar docker-compose.
#
# Requisito: tener openssl instalado (viene con Git Bash en Windows).
#
# Uso:
#   chmod +x generate-certs.sh   # solo en Linux/Mac
#   ./generate-certs.sh
#
# En Windows (Git Bash o WSL):
#   bash generate-certs.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

OUT="./nginx/certs"
mkdir -p "$OUT"

echo "### Generando certificado autofirmado para localhost..."

openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$OUT/key.pem" \
  -out "$OUT/cert.pem" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅  Certificado generado en $OUT/"
echo "    Válido 10 años. El navegador mostrará aviso de 'sitio no seguro'"
echo "    la primera vez — es normal con certificados autofirmados."
echo "    Acepta la excepción y la próxima vez no volverá a aparecer."
