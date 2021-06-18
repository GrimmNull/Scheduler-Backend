//imports
import express from 'express'
const app = express()
import taskRouter from './routes/taskRoutes.js'
import userRouter from './routes/userRoutes.js'
import cors from 'cors'
import morgan from 'morgan'
//constants
const PORT = 8000

//initializations
app.use(express.json())
app.use(cors())
app.use(morgan('combined'))
app.use('/tasks', taskRouter)
app.use('/users', userRouter)

// pt useri

//app start
app.listen(
    PORT,
    () => console.log(`It resides on http://localhost:${PORT}`)
)

//app endpoint
app.get(
    '/',
    (req, res) => {
        res.status(200).send({
            message: 'You shouldn`t be here'
        })
    }
)



