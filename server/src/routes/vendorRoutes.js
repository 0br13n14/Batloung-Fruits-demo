import { Router } from 'express';
import {
  createVendorController,
  deactivateVendorController,
  getVendorController,
  listVendorsController,
  updateVendorController
} from '../controllers/vendorController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { idParamValidator } from '../validators/sharedValidators.js';
import { listVendorValidators, vendorBodyValidators } from '../validators/vendorValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), listVendorValidators, validateRequest, asyncHandler(listVendorsController));
router.get('/:id', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), idParamValidator, validateRequest, asyncHandler(getVendorController));
router.post('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), vendorBodyValidators, validateRequest, asyncHandler(createVendorController));
router.put('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, vendorBodyValidators, validateRequest, asyncHandler(updateVendorController));
router.delete('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, validateRequest, asyncHandler(deactivateVendorController));

export default router;
