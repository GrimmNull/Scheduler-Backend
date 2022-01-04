import {Router} from 'express'
import * as CategoryController from '../controllers/CategoryController.js'

const router= Router()

router.get('/', CategoryController.getCategories)

export default router