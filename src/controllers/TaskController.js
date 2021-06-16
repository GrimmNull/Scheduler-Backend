import connection from '../databaseConnection.js'

const dateGex = new RegExp('^\\d{4}\\-(0?[1-9]|1[012])\\-(0?[1-9]|[12][0-9]|3[01])$')

export const getTaskById = (req, res) => {
    connection.query(`SELECT * FROM tasks WHERE id=${req.params.id}`, (err, rows) => {
        if (err) {
            res.status(400).json({
                message: 'There is no task with this id'
            })
            throw err
        }
        res.json({
            message: 'Task found successfully',
            user: rows[0].userId,
            description: rows[0].description,
            deadline: rows[0].deadline.toString().replace(/ GMT.*/, ''),
            completed: rows[0].completed === 1
        })
    })
}

export const addTask = (req, res) => {
    const {ownerId, deadline, description} = req.body
    if (!dateGex.test(deadline)) {
        res.status(400).json({
            message: 'The date format was not correct'
        })
        return
    }

    if (!ownerId) {
        res.status(400).json({
            message: 'The ownerId shouldn`t be null'
        })
        return
    }
    connection.query(`SELECT username FROM users WHERE id=${ownerId}`, (err, rows) => {
        if (err) {
            res.send(500).json({
                message: "There was a server error when retrieving the user"
            })
            throw err
        }
        if (!rows[0]) {
            res.status(400).json({
                message: 'There is no user with this id'
            })
        } else {
            connection.query(`INSERT INTO tasks(userId,deadline,description,completed) VALUES (${ownerId},'${deadline}','${description}',false)`, (err, result) => {
                if (err) {
                    res.status(500).json({
                        message: 'There was an error when trying to add the task'
                    })
                } else {
                    res.json({
                        message: 'Task successfully added',
                        taskId: result.insertId,
                        ownerId: ownerId,
                        deadline: deadline,
                        description: description,
                        finished: false
                    })
                }
            })
        }
    })

}

export const updateTask = (req, res) => {
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
            res.status(500).json({
                message: 'There was an error when trying to update the task'
            })
            throw err
        } else {
            res.json({
                message: 'The task was updated successfully'
            })
        }
    })
}

export const deleteTask = (req, res) => {
    connection.query(`DELETE FROM tasks WHERE id=${req.params.taskId}`, (err) => {
        if (err) {
            res.status(500).json({
                message: 'There was an error when trying to delete the task'
            })
            throw err
        } else {
            res.json({
                message: 'The task was deleted successfully'
            })
        }
    })
}