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

//to keep track of the requests that come to the backend
app.use(morgan('combined'))

//separated routers for tasks and users to have them better organized
app.use('/tasks', taskRouter)
app.use('/users', userRouter)


//app start
app.listen(
    PORT,
    () => console.log(`It resides at http://localhost:${PORT}`)
)

//app endpoint for a wrong adress
app.get(
    '/',
    (req, res) => {
        res.status(404).json({
            message: 'You shouldn`t be here'
        })
    }
)



