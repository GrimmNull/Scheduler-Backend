import {Router} from 'express'
import * as TaskController from '../controllers/TaskController.js'

const router = Router()

router.get('/:taskId', TaskController.getTaskById)
router.get('/subtasks/:taskId',TaskController.getSubtasks)
router.put('/:taskId', TaskController.updateTask)
router.put('/completed/:taskId', TaskController.updateCompletedStatus)
router.post('/', TaskController.addTask)
router.delete('/:taskId', TaskController.deleteTask)

export default router