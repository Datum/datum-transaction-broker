
const app = require('express')();
const bodyParser = require('body-parser');
const config = require('./utils/Config');
const logger = require('./utils/Logger');
const txService = require('./services/TransactionService');
const redisService = require('./services/RedisService');


let redis;

/**
 * Start transaction service workers
 */

txService.start();
/**
 * End
 */

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function isEmpty(v) {
  return typeof (v) === 'undefined' || v === null || v === '';
}

function isValidBody(body) {
  return !isEmpty(body)
     && !isEmpty(body.to)
     && !isEmpty(body.gasPrice)
     && !isEmpty(body.gasLimit);
}

function toObj(body) {
  return typeof body === 'string' ? JSON.stringify(body) : body;
}

app.post('/api/v1/transaction', (req, res) => {
  try {
    const body = toObj(req.body);
    logger.debug(`Incoming tx request: ${JSON.stringify(body)}`);
    if (isValidBody(body)) {
      txService.dispatch(body)
        .then((reqID) => {
          logger.debug(`Tx ID:${reqID}`);
          redis.blpop([reqID], 0, (err, [channelName, msg]) => {
            if (err) {
              logger.error(`${channelName}:Failed to process tx: ${reqID}\n${err}`);
              res.status(500).send({ error: 'Transaction failed to process' });
            } else {
              logger.debug(`Tx response:${reqID}:${msg}`);
              res.status(200).send(msg);
            }
          });
        });
    } else {
      throw new Error('missing or invalid request values');
    }
  } catch (err) {
    const tmpBody = typeof (req.body) === 'object' ? JSON.stringify(req.body) : req.body;
    logger.error(`Failed to dispatch request: ${tmpBody}\n${err}`);
    res.status(400).send({ error: 'Invalid request: missing or invalid request values' });
  }
});

logger.debug('Connecting to local redis...');
redisService.newRedis().then((red) => {
  redis = red;
  logger.debug(`Successfully connected to redis:${redis.id}`);
  app.listen(config.server.port, config.server.host, () => logger.info(`Server is up and running Socket:${config.server.host}:${config.server.port}`));
});
