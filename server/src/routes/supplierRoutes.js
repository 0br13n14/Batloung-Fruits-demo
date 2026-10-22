import { Router } from 'express';
import {
  createSupplierController,
  deleteSupplierController,
  getSupplierController,
  listSuppliersController,
  updateSupplierController
} from '../controllers/supplierController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { idParamValidator } from '../validators/sharedValidators.js';
import { listSupplierValidators, supplierBodyValidators } from '../validators/supplierValidators.js';

const router = Router();
router.use(authenticate, authorizeRoles(ROLES.ADMINISTRATOR));
router.get('/', listSupplierValidators, validateRequest, asyncHandler(listSuppliersController));
router.get('/:id', idParamValidator, validateRequest, asyncHandler(getSupplierController));
router.post('/', supplierBodyValidators, validateRequest, asyncHandler(createSupplierController));
router.put('/:id', idParamValidator, supplierBodyValidators, validateRequest, asyncHandler(updateSupplierController));
router.delete('/:id', idParamValidator, validateRequest, asyncHandler(deleteSupplierController));

export default router;
