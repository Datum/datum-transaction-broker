const path = require('path');
const winston = require('winston');
const config = require('../services/ConfigService');
require('winston-daily-rotate-file');

function ftc() {
  const tmp = {
    enabled: typeof config.logger !== 'undefined' && typeof config.logger.fileTransport !== 'undefined',
  };
  if (tmp.enabled) {
    const { ftPath } = config.logger.fileTransport.path;
    tmp.path = typeof ftPath !== 'undefined' && ftPath.length !== 0 ? ftPath : path.join(__dirname, '../', 'log', '%DATE%.log');
  }
  return tmp;
}
function getTransports() {
  /**
   * Adding beautiful logging :)
   */
  const transports = [];
  const fileTransportConf = ftc();
  if (fileTransportConf.enabled) {
    transports.push(new (winston.transports.DailyRotateFile)({
      filename: fileTransportConf.path,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      handleExceptions: true,
      level: 'debug',
    }));
  }
  transports.push(new winston.transports.Console({ level: config.logger.level }));
  return transports;
}

const transports = getTransports();
const loggerFormat = winston.format.printf(info => `${info.timestamp} ${info.level} : ${info.message}`);

const logger = winston.createLogger({
  exitOnError: false,
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.colorize(),
    loggerFormat,
  ),
  transports,
});

module.exports = logger;
