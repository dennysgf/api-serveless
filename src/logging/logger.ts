export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Readonly<Record<string, unknown>>;

export type Logger = {
  readonly debug: (message: string, fields?: LogFields) => void;
  readonly info: (message: string, fields?: LogFields) => void;
  readonly warn: (message: string, fields?: LogFields) => void;
  readonly error: (message: string, fields?: LogFields) => void;
  readonly child: (bindings: LogFields) => Logger;
};

export type LoggerOptions = {
  readonly level?: LogLevel;
  readonly write?: (line: string) => void;
};

type ResolvedLoggerOptions = {
  readonly level: LogLevel;
  readonly write: (line: string) => void;
};

const LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const writeToStdout = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const createLoggerWith = (options: ResolvedLoggerOptions, bindings: LogFields): Logger => {
  const log = (level: LogLevel, message: string, fields: LogFields = {}): void => {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[options.level]) {
      return;
    }
    options.write(
      JSON.stringify({
        ...bindings,
        ...fields,
        timestamp: new Date().toISOString(),
        level,
        message,
      }),
    );
  };

  return {
    debug: (message, fields) => {
      log('debug', message, fields);
    },
    info: (message, fields) => {
      log('info', message, fields);
    },
    warn: (message, fields) => {
      log('warn', message, fields);
    },
    error: (message, fields) => {
      log('error', message, fields);
    },
    child: (childBindings) => createLoggerWith(options, { ...bindings, ...childBindings }),
  };
};

export const createLogger = (options: LoggerOptions = {}): Logger =>
  createLoggerWith(
    {
      level: options.level ?? 'info',
      write: options.write ?? writeToStdout,
    },
    {},
  );

export const errorFields = (error: unknown): LogFields => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
  return {
    errorMessage: typeof error === 'string' ? error : 'Unknown error',
  };
};
