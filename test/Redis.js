const redisService = require('../services/RedisService');

const redisConnections = [];
const queues = ['q1', 'q2'];

function consume(err, [channel, msg]) {
  console.log(`${channel}:${msg}`);
  redisConnections[0].blpop([channel], 0, consume);
}

function listen() {
  queues.map(q => redisConnections[0].blpop([q], 0, consume));
}

function pushMsg(connection, queue, msg) {
  connection.lpush(queue, msg);
}

function randSelectQueue() {
  const i = Math.floor(Math.random() * Math.floor(queues.length));
  return queues[i];
}

Promise.all([redisService.newRedis(), redisService.newRedis()])
  .then((connections) => {
    redisConnections.push(connections[0]);
    redisConnections.push(connections[1]);
    listen();
  });
