FROM nginx:stable-alpine

RUN apk add --no-cache openssl

# Template del config (el entrypoint lo procesará con envsubst)
COPY app.conf.template /etc/nginx/templates/app.conf.template

# Entrypoint personalizado
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]