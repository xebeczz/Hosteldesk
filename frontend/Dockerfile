# Frontend — Vite build, served by nginx
# NOTE: no package-lock.json is committed (see .gitignore), so we use
# `npm install` instead of `npm ci`.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# BACKEND_HOST is injected at container start (nginx:alpine ships envsubst).
CMD ["/bin/sh", "-c", "export BACKEND_HOST=${BACKEND_HOST:-backend:8000} && envsubst '$BACKEND_HOST' < /etc/nginx/conf.d/default.conf > /tmp/default.conf && cp /tmp/default.conf /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
