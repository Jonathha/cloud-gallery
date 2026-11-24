import { Response } from 'express';
import { MAX_SHARES_PER_MEDIA } from './claimKeys';

export function handleShareCreationError(transErr: any, res: Response): boolean {
  if (transErr.message === 'SHARE_ID_ALREADY_EXISTS' || transErr.code === 'ALREADY_EXISTS') {
    res.status(409).json({
      success: false,
      error: 'Conflito: Este identificador de compartilhamento já existe. Tente gerar novamente com outro ID.'
    });
    return true;
  }
  if (transErr.message === 'SHARE_LIMIT_REACHED' || transErr.code === 'SHARE_LIMIT_REACHED') {
    res.status(409).json({
      success: false,
      code: 'SHARE_LIMIT_REACHED',
      limit: MAX_SHARES_PER_MEDIA,
      error: `Esta mídia já tem ${MAX_SHARES_PER_MEDIA} links ativos. Exclua um para criar outro.`
    });
    return true;
  }
  if (
    transErr.code === 'PRECONDITION_FAILED' ||
    transErr.status === 409 ||
    transErr.message?.includes('ABORTED') ||
    transErr.message?.includes('FAILED_PRECONDITION')
  ) {
    res.status(409).json({
      success: false,
      error: 'Já existe uma solicitação de compartilhamento sendo processada simultaneamente para esta imagem.'
    });
    return true;
  }
  return false;
}
