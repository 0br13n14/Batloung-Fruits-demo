import { Router } from 'express';
import {
  createOrderController,
  deleteOrderController,
  getOrderController,
  listOrdersController,
  updateOrderController
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { idParamValidator } from '../validators/sharedValidators.js';
import { createOrderValidators, listOrderValidators, updateOrderValidators } from '../validators/orderValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), listOrderValidators, validateRequest, asyncHandler(listOrdersController));
router.get('/:id', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), idParamValidator, validateRequest, asyncHandler(getOrderController));
router.post('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), createOrderValidators, validateRequest, asyncHandler(createOrderController));
router.put('/:id', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), idParamValidator, updateOrderValidators, validateRequest, asyncHandler(updateOrderController));
router.delete('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, validateRequest, asyncHandler(deleteOrderController));

export default router;
