import {Router} from 'express'
import * as UserController from '../controllers/UserController.js'

const router = Router()

router.get(':userId/tasks/', UserController.getUserTasks)
router.get('/:userId',UserController.getUserById)
router.put('/:userId',UserController.editUser)
router.post('/', UserController.addUser)
router.delete('/:userId',UserController.deleteUser)

export default router