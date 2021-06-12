//imports
const express = require('express')
const app = express()
const mysql = require('mysql')

//constants
const PORT = 8000
const dateGex = new RegExp('^\\d{4}\\-(0?[1-9]|1[012])\\-(0?[1-9]|[12][0-9]|3[01])$')
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'schedulerConnection',
    password: 'schedulerBase',
    database: 'scheduler'
})

//initializations
app.use(express.json())
connection.connect()


//app start
app.listen(
    PORT,
    () => console.log(`It resides on http://localhost:${PORT}`)
)

//app endpoints
app.get(
    '/',
    (req, res) => {
        res.status(200).send({
            message: 'You shouldn`t be here'
        })
    }
)

app.get(
    '/users/:userId/tasks/',
    (req, res) => {
        connection.query(`SELECT * FROM tasks WHERE userId=${req.params.userId}`, (err, rows) => {
            if (err) {
                res.status(400).send({
                    message: 'There are no tasks for this id'
                })
            }
            const results = rows.map(row => {
                return {
                    taskId: row.id,
                    userId: row.userId,
                    deadline: row.deadline,
                    description: row.description,
                    completed: row.completed === 1
                }
            })
            res.status(200).send({
                message: 'Tasks successfully returned',
                results: results
            })
        })
    }
)

app.get(
    '/tasks/:id',
    (req, res) => {
        connection.query(`SELECT * FROM tasks WHERE id=${req.params.id}`, (err, rows) => {
            if (err) {
                res.status(400).send({
                    message: 'There is no task with this id'
                })
                return
            }
            res.status(200).send({
                message: 'Task found successfully',
                user: rows[0].userId,
                description: rows[0].description,
                deadline: rows[0].deadline.toString().replace(/ GMT.*/, ''),
                completed: rows[0].completed === 1
            })
        })
    }
)

app.post(
    '/tasks/',
    (req, res) => {
        const {ownerId, deadline, description} = req.body
        if (!dateGex.test(deadline)) {
            res.status(400).send({
                message: 'The date format was not correct'
            })
            return
        }

        if (!ownerId) {
            res.status(400).send({
                message: 'The ownerId shouldn`t be null'
            })
            return
        }
        connection.query(`SELECT username FROM users WHERE id=${ownerId}`, (err, rows) => {
            if (err) {
                //
            }
            if (!rows[0]) {
                res.status(400).send({
                    message: 'There is no user with this id'
                })
                return
            } else {
                connection.query(`INSERT INTO tasks(userId,deadline,description,completed) VALUES (${ownerId},'${deadline}','${description}',false)`, (err, result) => {
                    if (err) {
                        res.status(500).send({
                            message: 'There was an error when trying to add the task'
                        })
                        return
                    }
                    res.status(200).send({
                        message: 'Task successfully added',
                        taskId: result.insertId,
                        ownerId: ownerId,
                        deadline: deadline,
                        description: description,
                        finished: false
                    })
                    return
                })
            }
        })

    }
)

app.put(
    '/tasks/:taskId',
    (req, res) => {
        let updateFields = []
        for (const field of req.body.columns.split(" ")) {
            if (!['completed', 'userId'].includes(field)) {
                updateFields.push(`${field} = '${req.body[field]}'`)
            } else {
                updateFields.push(`${field} = ${req.body[field]}`)
            }
        }
        connection.query(`UPDATE tasks SET ${updateFields} WHERE id=${req.params.taskId}`, (err, result) => {
            if (err) {
                res.status(500).send({
                    message: 'There was an error when trying to update the task'
                })
                throw err
                return
            }
            res.status(200).send({
                message: 'The task was updated successfully'
            })
            return
        })
    }
)

app.delete(
    '/tasks/:taskId',
    (req, res) => {
        connection.query(`DELETE FROM tasks WHERE id=${req.params.taskId}`, (err) => {
            if (err) {
                res.status(500).send({
                    message: 'There was an error when trying to delete the task'
                })
                throw err
                return
            } else {
                res.status(200).send({
                    message: 'The task was deleted successfully'
                })
            }
        })
    }
)