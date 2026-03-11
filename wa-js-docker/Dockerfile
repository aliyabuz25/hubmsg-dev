FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=2004 \
    TZ=Europe/Istanbul \
    PUPPETEER_SKIP_DOWNLOAD=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata tini tar \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --no-package-lock

COPY server.js gateway.js runner.js healthcheck.js ./
COPY public ./public
COPY views ./views
COPY seed-data ./seed-data
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/datalar /app/tenant_data /app/backups /app/uploads /app/nginx-logs

EXPOSE 2004 2005

VOLUME ["/app/datalar", "/app/tenant_data", "/app/backups", "/app/uploads", "/app/nginx-logs"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD ["node", "healthcheck.js"]

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD ["node", "runner.js"]
