FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev --no-audit --no-fund; fi
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
