// Limita quantas requisições a mesma chave (IP, ou IP + usuário) faz numa janela de tempo.
// Fica em memória: simples e suficiente para um único servidor.
export function rateLimit({ windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [name, entry] of hits) if (entry.resetAt <= now) hits.delete(name);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const name = key(req);
    let entry = hits.get(name);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(name, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
