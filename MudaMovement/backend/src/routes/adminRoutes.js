import { Router } from 'express'
import {
  createUser,
  deleteUser,
  getSetupStatus,
  listUsers,
  setupInitialAdmins,
  updateUser,
} from '../controllers/adminController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import adminMiddleware from '../middleware/adminMiddleware.js'
import { rateLimit } from 'express-rate-limit'

const router = Router()
const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Terlalu banyak percobaan setup. Coba lagi dalam 15 menit.' }),
})

router.get('/setup/status', getSetupStatus)
router.post('/setup', setupLimiter, setupInitialAdmins)
router.use(authMiddleware, adminMiddleware)
router.get('/users', listUsers)
router.post('/users', createUser)
router.patch('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router
