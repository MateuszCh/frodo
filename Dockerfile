# Angular CLI 22 requires Node >= 24.15
FROM node:24.16-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY front/package.json front/package-lock.json ./front/
RUN cd front && npm ci

FROM deps AS prod

COPY . .

# Build the Angular 22 app into front/public (served statically by app.js)
RUN cd front && npm run build

EXPOSE 3000

CMD ["node", "app.js"]
