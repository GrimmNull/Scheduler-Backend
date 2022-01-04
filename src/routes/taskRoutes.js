import {Router} from 'express'
import * as TaskController from '../controllers/TaskController.js'

const router = Router()

router.get('/:taskId', TaskController.getTaskById)
router.get('/user/:userId', TaskController.getUserTasks)
router.get('/day/:userId', TaskController.getTasksForDay)
router.put('/:taskId', TaskController.updateTask)
router.put('/completed/:taskId', TaskController.updateCompletedStatus)
router.put('/categories/:taskId',TaskController.updateCategories)
router.post('/', TaskController.addTask)
router.delete('/:taskId', TaskController.deleteTask)

export default router