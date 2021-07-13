import {Router} from 'express'
import * as TaskController from '../controllers/TaskController.js'

const router = Router()

router.get('/:userId', TaskController.getUserTasks)
router.put('/:taskId', TaskController.updateTask)
router.put('/completed/:taskId', TaskController.updateCompletedStatus)
router.post('/', TaskController.addTask)
router.delete('/:taskId', TaskController.deleteTask)

export default router