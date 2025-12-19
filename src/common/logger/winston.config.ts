import { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogstashTransport } from '../logstash-config/logstash.config';

export const winstonConfig = {
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: process.env.LOG_LEVEL || 'info', // Tüm logları terminale bas
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf((info) => {
          const timestamp =
            typeof info.timestamp === 'string' ? info.timestamp : '';
          const level = typeof info.level === 'string' ? info.level : '';
          const message = typeof info.message === 'string' ? info.message : '';
          const context =
            typeof info.context === 'string' ? info.context : 'Application';
          const stack = typeof info.stack === 'string' ? `\n${info.stack}` : '';
          return `${timestamp} [${context}] ${level}: ${message}${stack}`;
        }),
      ),
    }),

    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: format.combine(format.timestamp(), format.json()),
    }),

    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: format.combine(format.timestamp(), format.json()),
    }),

    // Logstash transport (Elasticsearch'e log göndermek için)
    new LogstashTransport({
      host: process.env.LOGSTASH_HOST || 'localhost',
      port: parseInt(process.env.LOGSTASH_PORT || '5000', 10),
    }),
  ],
};
