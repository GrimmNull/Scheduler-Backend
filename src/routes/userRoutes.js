import {Router} from 'express'
import * as UserController from '../controllers/UserController.js'

const router = Router()

router.get('/:userId',UserController.getUserById)
router.get('/stats/:userId', UserController.getUserStats)
router.put('/:userId',UserController.updateUser)
router.post('/auth/login',UserController.checkCredentials)
router.post('/', UserController.addUser)
router.delete('/:userId',UserController.deleteUser)
export default router