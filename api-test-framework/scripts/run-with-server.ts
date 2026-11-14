/**
 * Convenience runner: starts the mock server in-process, runs the full suite,
 * then shuts the server down. Exit code mirrors the test result.
 *   npm run test:local
 */
import { spawn } from 'node:child_process';
import { createMockServer } from '../../mock-server/src/server.ts';

const port = Number(process.env.PORT ?? 4000);
const baseUrl = `http://localhost:${port}`;

process.env.MOCK_LOG = 'off';
const { server } = createMockServer();
await new Promise<void>((resolve) => server.listen(port, resolve));
console.log(`Mock server started on ${baseUrl}`);

const tests = spawn('npm', ['test'], { stdio: 'inherit', env: { ...process.env, API_BASE_URL: baseUrl } });
const code: number = await new Promise((resolve) => tests.on('exit', (c) => resolve(c ?? 1)));

server.closeAllConnections();
server.close();
process.exitCode = code;
console.log(`\nHTML report: reports/api-report.html  |  JUnit: reports/junit.xml`);
