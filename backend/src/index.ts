import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { v1 } from './routes/v1';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/api/v1', v1);

app.get('/health', (c) => c.json({ status: 'ok' }));

const server = Bun.serve({
  port: Number(process.env.PORT ?? 5050),
  fetch: app.fetch,
});

console.log(`Listening on ${server.url}`);
