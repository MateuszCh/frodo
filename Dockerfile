FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json ./
RUN npm install

COPY front/package.json ./front/
RUN cd front && npm install

FROM deps AS prod

COPY . .

RUN cd front && npm start

EXPOSE 3000

CMD ["node", "app.js"]
