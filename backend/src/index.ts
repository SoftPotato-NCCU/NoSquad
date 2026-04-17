import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import auth from './routes/auth';
import rooms from './routes/rooms';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/api/v1/auth', auth);
app.route('/api/v1/rooms', rooms);

app.get('/health', (c) => c.json({ status: 'ok' }));

const server = Bun.serve({
  port: Number(process.env.PORT ?? 5050),
  fetch: app.fetch,
});

console.log(`Listening on ${server.url}`);
