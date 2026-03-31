FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --silent
COPY . .
ARG VITE_API_URL=https://rova-api-870997691637.us-central1.run.app
ARG VITE_WS_URL=wss://rova-api-870997691637.us-central1.run.app
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server { \
  listen 3000; \
  root /usr/share/nginx/html; \
  index index.html; \
  location /api { \
    proxy_pass https://rova-api-870997691637.us-central1.run.app; \
    proxy_ssl_server_name on; \
    proxy_set_header Host rova-api-870997691637.us-central1.run.app; \
  } \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
