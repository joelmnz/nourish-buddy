import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const mode of ['fresh', 'legacy', 'api']) {
  test(`weight notes: ${mode}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nourish-weight-notes-'));
    try {
      const proc = Bun.spawn([process.execPath, 'run', 'server/weights-notes-fixture.ts', mode], {
        env: {
          PATH: process.env.PATH,
          TMPDIR: tmpdir(),
          DATABASE_PATH: join(dir, 'test.sqlite'),
          ADMIN_USERNAME: 'test',
          ADMIN_PASSWORD: 'test-password',
          SESSION_SECRET: 'test-session-secret-at-least-32-characters',
          ALLOWED_ORIGIN: 'http://localhost:5173',
          NODE_ENV: 'test',
        },
        stdout: 'pipe', stderr: 'pipe',
      });
      const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      if (code !== 0) throw new Error(`Fixture ${mode} failed (${code}): ${JSON.stringify({ stdout, stderr })}`);
      expect(code).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
