import { Router } from 'express';
import {
  createProductController,
  deactivateProductController,
  getProductController,
  listProductsController,
  updateProductController
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { idParamValidator } from '../validators/sharedValidators.js';
import { listProductValidators, productBodyValidators } from '../validators/productValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), listProductValidators, validateRequest, asyncHandler(listProductsController));
router.get('/:id', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), idParamValidator, validateRequest, asyncHandler(getProductController));
router.post('/', authorizeRoles(ROLES.ADMINISTRATOR), productBodyValidators, validateRequest, asyncHandler(createProductController));
router.put('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, productBodyValidators, validateRequest, asyncHandler(updateProductController));
router.delete('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, validateRequest, asyncHandler(deactivateProductController));

export default router;
