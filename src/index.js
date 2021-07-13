//imports
import express from 'express'

const app = express()
import taskRouter from './routes/taskRoutes.js'
import userRouter from './routes/userRoutes.js'
import connection from "./databaseConnection.js";
import cors from 'cors'
import morgan from 'morgan'
import cron from 'node-cron'
import dotenv from 'dotenv';
import Knex from 'knex'
import bookshelf from 'bookshelf'
dotenv.config()

//constants



//initializations
app.use(express.json())
app.use(cors())

//to keep track of the requests that come to the backend
app.use(morgan('combined'))

//separated routers for tasks and users to have them better organized
app.use('/tasks', taskRouter)
app.use('/users', userRouter)


//Folosim cron pentru a verifica din 20 in 20 de minute daca avem task-uri ce au expirat
const task= cron.schedule('0 */20 * * * *', () => {
    connection.query('UPDATE tasks SET failed=true WHERE deadline < CURRENT_TIMESTAMP', (err) => {
        if (err) {
            throw err
        } else {
            console.log("I've updated the failed status of the tasks")
        }
    }, {
        scheduled:false
    })
})

task.start()

//app start
app.listen(
    process.env.PORT,
    () => console.log(`It resides at http://localhost:${process.env.PORT}`)
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



