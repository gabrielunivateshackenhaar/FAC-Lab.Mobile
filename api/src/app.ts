import cors from 'cors';
import express from 'express';
import { NotFoundError } from './core/errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { healthRoutes } from './modules/health/health.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRoutes);

app.use((_request, _response, next) => {
  next(new NotFoundError('Rota nao encontrada'));
});

app.use(errorHandler);

export { app };
