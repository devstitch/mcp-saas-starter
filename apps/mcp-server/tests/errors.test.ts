import { describe, expect, it } from 'vitest';
import { toClientError } from '../src/server/errors.js';

describe('toClientError', () => {
  it('returns a generic InternalError and logs the database failure', () => {
    const logs: unknown[][] = [];
    const failure = new Error(
      'select * from public.tasks failed: relation "secret_table" does not exist',
    );
    failure.stack = `Error: ${failure.message}\n    at db.query (postgres.js:10:1)`;

    const client = toClientError(failure, (...args) => {
      logs.push(args);
    });
    const encoded = JSON.stringify(client.body);

    expect(client.status).toBe(500);
    expect(client.body.error).toBe('internal_error');
    expect(client.body.error_description).toBe('Internal server error');
    expect(client.body.correlation_id).toBeTruthy();
    expect(encoded).not.toContain('secret_table');
    expect(encoded).not.toContain('select *');
    expect(encoded).not.toContain('postgres.js');

    const logged = JSON.stringify(logs);
    expect(logged).toContain('secret_table');
    expect(logged).toContain(client.body.correlation_id);
  });
});
