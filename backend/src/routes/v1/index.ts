import { Hono } from 'hono';
import auth from './auth';
import rooms from './rooms';
import users from './users';

const v1 = new Hono();
v1.route('/auth', auth);
v1.route('/rooms', rooms);
v1.route('/users', users);

export { v1 };
