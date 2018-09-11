const app = require('express')();
const bodyParser = require('body-parser');
const config = require('./utils/Config');
const logger = require('./utils/Logger');
const txService = require('./services/TransactionService');
const redisService = require('./services/RedisService');

const redis = redisService.newRedis();

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

function isValidReq(req) {
  return !isEmpty(req)
  && !isEmpty(req.to)
  && !isEmpty(req.gasPrice)
  && !isEmpty(req.gasLimit);
}

app.post('/api/v1/transaction', (req, res) => {
  try {
    logger.debug(`Incoming tx request: ${req.body}`);
    const obj = JSON.parse(req.body);
    if (isValidReq(obj)) {
      txService.dispatch(obj)
        .then((reqID) => {
          redis.blpop([reqID], 0, (err, [channelName, msg]) => {
            if (err) {
              logger.error(`${channelName}:Failed to process tx: ${reqID}\n${err}`);
              res.status(500).send({ error: 'Transaction failed to process' });
            } else {
              logger.debug(`Tx ${reqID}: ${msg}`);
              res.status(200).send(msg);
            }
          });
        });
    } else {
      throw new Error('missing or invalid request values');
    }
  } catch (err) {
    logger.error(`Failed to dispatch request: ${req.body}\n${err}`);
    res.status(400).send({ error: 'Invalid request: missing or invalid request values' });
  }
});


app.listen(config.server.port, config.server.host, () => logger.info(`Server is up and running Socket:${config.server.host}:${config.server.port}`));
