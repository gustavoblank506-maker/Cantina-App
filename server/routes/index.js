import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as menu from '../controllers/menuController.js';
import * as notice from '../controllers/noticeController.js';
import * as orders from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { Report } from '../models/Report.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const fifteenMinutes = 15 * 60 * 1000;
const tooMany = 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';

// Por IP: freia robôs testando muitas contas. O limite é folgado porque a escola inteira pode sair pelo mesmo IP.
const authLimiter = rateLimit({ windowMs: fifteenMinutes, max: 100, message: tooMany });
// Por IP + usuário: freia quem tenta adivinhar a senha de uma conta.
const loginLimiter = rateLimit({
  windowMs: fifteenMinutes,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.username ?? '').trim().toLowerCase().slice(0, 30)}`,
  message: tooMany,
});

export const router = Router();

router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, loginLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);
router.get('/school', auth.schoolOptions);

router.get('/menu', requireAuth, menu.list);
router.post('/menu', requireRole('atendente'), menu.create);
router.patch('/menu/:id', requireRole('atendente'), menu.update);

router.get('/reports/today', requireRole('atendente'), (req, res) => res.json({ report: Report.today() }));

router.get('/notice', requireAuth, notice.show);
router.put('/notice', requireRole('atendente'), notice.update);

router.get('/orders', requireAuth, orders.list);
router.post('/orders', requireRole('aluno'), orders.create);
router.get('/orders/:id', requireAuth, orders.show);
router.patch('/orders/:id/status', requireRole('atendente'), orders.updateStatus);
