import fs from 'fs';
import path from 'path';
import { app } from './app';
import { getDatabase } from './config/database';
import { env } from './config/env';

function bootstrap(): void {
  const filesDirectory = path.resolve(__dirname, '../', env.FILES_DIR);
  if (!fs.existsSync(filesDirectory)) {
    fs.mkdirSync(filesDirectory, { recursive: true });
  }

  getDatabase();

  app.listen(env.PORT, () => {
    console.log(`Servidor rodando em http://localhost:${env.PORT}`);
    console.log(`Ambiente: ${env.NODE_ENV}`);
  });
}

bootstrap();
