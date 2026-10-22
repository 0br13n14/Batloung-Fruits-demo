import { Router } from 'express';
import {
  createFruitController,
  deactivateFruitController,
  getFruitController,
  listFruitsController,
  updateFruitController
} from '../controllers/fruitController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants.js';
import { fruitBodyValidators, listFruitValidators } from '../validators/fruitValidators.js';
import { idParamValidator } from '../validators/sharedValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), listFruitValidators, validateRequest, asyncHandler(listFruitsController));
router.get('/:id', authorizeRoles(ROLES.ADMINISTRATOR, ROLES.SALES), idParamValidator, validateRequest, asyncHandler(getFruitController));
router.post('/', authorizeRoles(ROLES.ADMINISTRATOR), fruitBodyValidators, validateRequest, asyncHandler(createFruitController));
router.put('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, fruitBodyValidators, validateRequest, asyncHandler(updateFruitController));
router.delete('/:id', authorizeRoles(ROLES.ADMINISTRATOR), idParamValidator, validateRequest, asyncHandler(deactivateFruitController));

export default router;
