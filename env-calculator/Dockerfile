FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Create a dedicated runtime user and grant write access to app data.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && mkdir -p /app/data /app/backups && chown -R appuser:appgroup /app

EXPOSE 9999

USER appuser

CMD ["npm", "run", "start"]