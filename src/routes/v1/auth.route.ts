import express, { Router } from 'express';
import { authController } from '../../controllers';
const router = express.Router();

router.post('/register', authController.registerController);
router.post('/login', authController.loginController);
router.post('/refreshToken', authController.refreshTokenController);
router.post('/revokeRefreshTokens', authController.revokeRefreshTokensController);

export default router;
