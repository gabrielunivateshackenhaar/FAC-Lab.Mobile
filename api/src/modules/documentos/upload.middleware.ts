import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../../core/errors/AppError';

const filesDirectory = path.resolve(__dirname, '../../../files');

if (!fs.existsSync(filesDirectory)) {
  fs.mkdirSync(filesDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, filesDirectory);
  },
  filename: (_req, file, callback) => {
    const hash = crypto.randomUUID();
    const extensao = path.extname(file.originalname);
    callback(null, `${hash}${extensao}`);
  }
});

const tiposMimePermitidos = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!tiposMimePermitidos.includes(file.mimetype)) {
      return callback(
        new BadRequestError('Formato de arquivo nao suportado. Permitidos: PDF, JPEG, PNG, WEBP')
      );
    }
    callback(null, true);
  }
});
