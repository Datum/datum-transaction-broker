const config = require('./services/ConfigService');
const logger = require('./utils/Logger');
const txService = require('./services/TransactionService');
const redisService = require('./services/RedisService');
const createApp = require('./app');

const startServer = async () => {
  logger.debug('Connecting to local redis...');
  const redis = await redisService.newRedis();
  logger.debug(`Successfully connected to redis:${redis.id}`);


  /**
   * Start transaction service workers
   */

  txService.start();
  /**
   * End
   */

  const services = {
    redis,
    txService,
  };
  const app = createApp(services);

  const port = process.env.PORT || config.server.port;
  app.listen(port, () => logger.info(`Server is up and running at port ${port}`));
};

startServer()
  .then()
  .catch(logger.error);
