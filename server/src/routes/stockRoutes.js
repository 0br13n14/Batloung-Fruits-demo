import { Router } from 'express';
import {
  listStockController,
  recordPurchaseController,
  updateStockController
} from '../controllers/stockController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { idParamValidator } from '../validators/sharedValidators.js';
import { listStockValidators, purchaseBodyValidators, stockUpdateValidators } from '../validators/stockValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), listStockValidators, validateRequest, asyncHandler(listStockController));
router.post('/', authorizeRoles(ROLES.ADMINISTRATOR), purchaseBodyValidators, validateRequest, asyncHandler(recordPurchaseController));
router.put('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, stockUpdateValidators, validateRequest, asyncHandler(updateStockController));

export default router;
