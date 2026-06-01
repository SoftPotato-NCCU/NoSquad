import { Hono } from 'hono';
import auth from './auth';
import rooms from './rooms';

const v1 = new Hono();
v1.route('/auth', auth);
v1.route('/rooms', rooms);

export { v1 };
