import {Router} from 'express'
import * as UserController from '../controllers/UserController.js'

const router = Router()

router.get('/tasks/:userId/', UserController.getUserTasks)
router.get('/:userId',UserController.getUserById)
router.get('/auth/logging',UserController.checkCredentials)
router.put('/:userId',UserController.editUser)
router.post('/', UserController.addUser)
router.delete('/:userId',UserController.deleteUser)
export default router