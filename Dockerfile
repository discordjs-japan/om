FROM node:18 as builder

WORKDIR /app

COPY ./* ./

RUN npm install
RUN npm run build

FROM node:18-alpine as runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist/main.js ./dist
COPY ./package.json ./

RUN npm install

CMD ["node", "main.js"]
