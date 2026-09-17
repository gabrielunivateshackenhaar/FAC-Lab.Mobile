import cors from 'cors';
import express from 'express';
import { NotFoundError } from './core/errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { agendaRoutes } from './modules/agenda/agenda.routes';
import { alunosRoutes } from './modules/alunos/alunos.routes';
import { auditoriaRoutes } from './modules/auditoria/auditoria.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { documentosRoutes } from './modules/documentos/documentos.routes';
import { healthRoutes } from './modules/health/health.routes';
import { matriculasRoutes } from './modules/matriculas/matriculas.routes';
import { presencasRoutes } from './modules/presencas/presencas.routes';
import { turmasRoutes } from './modules/turmas/turmas.routes';
import { unidadesRoutes } from './modules/unidades/unidades.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/alunos', alunosRoutes);
app.use('/turmas', turmasRoutes);
app.use('/matriculas', matriculasRoutes);
app.use('/documentos', documentosRoutes);
app.use('/agenda', agendaRoutes);
app.use('/presencas', presencasRoutes);
app.use('/auditoria', auditoriaRoutes);

app.use((_request, _response, next) => {
  next(new NotFoundError('Rota nao encontrada'));
});

app.use(errorHandler);

export { app };
