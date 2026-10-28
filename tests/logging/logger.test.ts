import { describe, expect, it } from 'vitest';

import { createLogger, errorFields } from '../../src/logging/logger.js';

const ANY_STRING: unknown = expect.any(String);

const captureLogger = (level?: 'debug' | 'info' | 'warn' | 'error') => {
  const lines: string[] = [];
  const logger = createLogger({
    ...(level === undefined ? {} : { level }),
    write: (line) => {
      lines.push(line);
    },
  });
  return { logger, lines };
};

const parseLine = (line: string | undefined): unknown => JSON.parse(line ?? '');

describe('createLogger', () => {
  it('writes one JSON line with timestamp, level, message and fields', () => {
    const { logger, lines } = captureLogger('debug');

    logger.info('city found', { city: 'Bogotá' });

    expect(lines).toHaveLength(1);
    expect(parseLine(lines[0])).toEqual({
      timestamp: ANY_STRING,
      level: 'info',
      message: 'city found',
      city: 'Bogotá',
    });
  });

  it('adds child bindings such as a request identifier to every entry', () => {
    const { logger, lines } = captureLogger('debug');
    const requestLogger = logger.child({ requestId: 'req-1' });

    requestLogger.warn('slow upstream');
    requestLogger.error('failed', { statusCode: 502 });

    expect(parseLine(lines[0])).toMatchObject({ requestId: 'req-1', level: 'warn' });
    expect(parseLine(lines[1])).toMatchObject({
      requestId: 'req-1',
      level: 'error',
      statusCode: 502,
    });
  });

  it('skips entries below the configured level', () => {
    const { logger, lines } = captureLogger('warn');

    logger.debug('ignored');
    logger.info('ignored too');
    logger.warn('kept');

    expect(lines).toHaveLength(1);
    expect(parseLine(lines[0])).toMatchObject({ level: 'warn', message: 'kept' });
  });

  it('does not let fields override level, message or timestamp', () => {
    const { logger, lines } = captureLogger('debug');

    logger.info('real message', { level: 'error', message: 'fake', timestamp: 'fake' });

    expect(parseLine(lines[0])).toMatchObject({ level: 'info', message: 'real message' });
    expect(parseLine(lines[0])).toMatchObject({ timestamp: ANY_STRING });
    expect(parseLine(lines[0])).not.toMatchObject({ timestamp: 'fake' });
  });
});

describe('errorFields', () => {
  it('extracts name, message and stack from an Error', () => {
    expect(errorFields(new TypeError('boom'))).toEqual({
      errorName: 'TypeError',
      errorMessage: 'boom',
      errorStack: ANY_STRING,
    });
  });

  it('handles non-Error values', () => {
    expect(errorFields('oops')).toEqual({ errorMessage: 'oops' });
    expect(errorFields(42)).toEqual({ errorMessage: 'Unknown error' });
  });
});
