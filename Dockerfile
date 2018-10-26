FROM node:10

WORKDIR datum-transaction-broker

COPY . .

RUN npm install

RUN npm install -g pm2
RUN mkdir logs

EXPOSE 8081

CMD ["pm2-docker", "start", "server.js"]
