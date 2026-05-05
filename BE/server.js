import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import config from './config/index.js';
import { connect } from './db/index.js';
import routes from './routes/index.js';
import errorHandler from './middlewares/errorHandler.js';
import rateLimiter from './middlewares/rateLimiter.js';
import { init as initSockets } from './sockets/index.js';
import { registerAdapter } from './services/eventBus.js';
import { websocketAdapter } from './services/websocketAdapter.js';
import { ensureBootstrapAdmin } from './controllers/authController.js';

async function start() {
  await connect();
  await ensureBootstrapAdmin();

  const app = express();
  const server = http.createServer(app);

  const corsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  };

  const io = initSockets(server, { cors: corsOptions });

  // register websocket adapter for EventBus
  registerAdapter(websocketAdapter);

  app.use(helmet());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cors(corsOptions));
  app.use(rateLimiter);

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use('/api', routes);

  app.get('/', (req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  const port = config.port;
  server.listen(port, () => console.log(`Server listening on ${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
