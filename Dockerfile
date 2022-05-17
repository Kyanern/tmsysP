FROM node:latest AS appbuilder

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE $PORT

FROM alpine:latest

WORKDIR /root/

RUN apk add --update nodejs npm

COPY --from=appbuilder /app .

CMD ["node", "index.js"]