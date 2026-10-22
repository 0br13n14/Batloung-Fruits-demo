import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { currentUserController, loginController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginValidators } from '../validators/authValidators.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Try again later.', fields: [] } }
});

router.post(
  '/login',
  loginLimiter,
  loginValidators,
  validateRequest,
  asyncHandler(loginController)
);
router.get('/me', authenticate, asyncHandler(currentUserController));

export default router;
