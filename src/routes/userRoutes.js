import {Router} from 'express'
import * as UserController from '../controllers/UserController.js'

const router = Router()

router.get('/:userId',UserController.getUserById)
router.put('/:userId',UserController.editUser)
router.post('/auth/login',UserController.checkCredentials)
router.post('/', UserController.addUser)
router.delete('/:userId',UserController.deleteUser)
export default router