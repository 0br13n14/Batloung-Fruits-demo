import { Router } from 'express';
import { getReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { reportQueryValidators } from '../validators/reportValidators.js';

const router = Router();
router.get(
  '/:reportName',
  authenticate,
  authorizeRoles(ROLES.ADMINISTRATOR),
  reportQueryValidators,
  validateRequest,
  asyncHandler(getReportController)
);

export default router;
