FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src/data.js src/engine.js src/curriculum.js src/placement.js ./src/
COPY src/english-content.js ./src/
COPY src/ai-content.js ./src/
COPY src/coding-content.js ./src/
COPY src/thinking-content.js ./src/
COPY src/narratives.js ./src/
COPY src/age-challenges.js src/platform-engines.js ./src/
COPY server ./server
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=3001 DB_FILE=/data/kids.db NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:3001/api/health || exit 1
CMD ["node","server/app.mjs"]
