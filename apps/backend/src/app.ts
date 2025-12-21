import express, { type Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';

// Error Middlewares
import { errorHandler, notFoundHandler } from './middlewares/errors.js';

// REST Routers
import { documentsRouter } from './routes/documents.js';
import { revisionsRouter } from './routes/revisions.js';
import { editorSettingsRouter } from './routes/editor-settings.js';
import { favoritesRouter } from './routes/favorites.js';
import { storageRouter } from './routes/storage.js';

const app: Express = express();

app.use(cors());

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/documents', documentsRouter);
app.use('/api/revisions', revisionsRouter);
app.use('/api/editor-settings', editorSettingsRouter);
app.use('/api/favorites', favoritesRouter);

app.use('/storage', storageRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
