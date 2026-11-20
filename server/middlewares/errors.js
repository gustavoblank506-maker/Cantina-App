import { HttpError } from '../utils/httpError.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

// Detalhes técnicos ficam no log do servidor; o usuário recebe só uma mensagem clara.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Dados grandes demais.' });
  console.error(error);
  res.status(500).json({ error: 'Erro interno. Tente novamente.' });
}
