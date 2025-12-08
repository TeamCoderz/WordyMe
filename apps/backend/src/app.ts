import express, { type Express } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';

const app: Express = express();

app.use(cors());

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

export default app;
