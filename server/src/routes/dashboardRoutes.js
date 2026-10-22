import { Router } from 'express';
import { getDashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';

const router = Router();
router.get('/', authenticate, authorizeRoles(ROLES.ADMINISTRATOR), asyncHandler(getDashboardController));

export default router;
