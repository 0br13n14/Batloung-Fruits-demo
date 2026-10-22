import { Router } from 'express';
import {
  getBoxSizesController,
  getProvincesController
} from '../controllers/lookupController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';

const router = Router();

const requireLookupAccess = [
  authenticate,
  authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES)
];
router.get('/provinces', requireLookupAccess, asyncHandler(getProvincesController));
router.get('/box-sizes', requireLookupAccess, asyncHandler(getBoxSizesController));

export default router;
