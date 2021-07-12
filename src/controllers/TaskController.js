import connection from '../databaseConnection.js'
import token from '../token.js'
import jwt from 'jsonwebtoken'

export const getTaskById = (req, res) => {
    const getTaskQuery= `SELECT * FROM tasks WHERE id=` + connection.escape(req.params.id)
    connection.query(getTaskQuery, (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to fetch the task'
            })
            throw err
        }
        if (!rows[0]) {
            res.status(404).json({
                message: 'There is no task with this id'
            })
        } else {
            res.json({
                message: 'Task found successfully',
                user: rows[0].userId,
                description: rows[0].description,
                startTime: rows[0].startTime.toISOString().replace(/:00\.000.+/, ''),
                deadline: rows[0].deadline.toISOString().replace(/:00\.000.+/, ''),
                completed: rows[0].completed === 1
            })
        }
    })
}

export const addTask = async (req, res) => {
    const {ownerToken, parentTaskId, startTime, deadline, description, type} = req.body
    if (!ownerToken) {
        res.status(400).json({
            message: 'You need to send an ownerToken with your request'
        })
        return
    }
    const decoded = await jwt.verify(ownerToken, token)
    const ownerId = decoded.userId
    //we need to know who we add the task to, so we make sure that we have an id
    if (!ownerId) {
        res.status(400).json({
            message: 'The ownerId shouldn`t be null'
        })
        return
    }
    //facem un request catre baza de date pentru a verifica daca userul exista
    const usernameQuery= `SELECT username FROM users WHERE id=` + connection.escape(ownerId)
    connection.query(usernameQuery, (err, rows) => {
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
            //when we add a task from the frontend, we just add it in the database so we can get an id
            //after that we use the id that we got to update the task with the actual information that we need
            //In the first phase we need to know its owner id, its parent id, if it has one
            const fields = parentTaskId ? '(userId, parentTaskId, completed)' : '(userId,completed)',
                values = parentTaskId ? `(` + connection.escape(ownerId) + `,` +  connection.escape(parentTaskId) + `,false)` : `(` + connection.escape(ownerId) + `,false)`
            connection.query(`INSERT INTO tasks${fields} VALUES ${values}`, (err, result) => {
                if (err) {
                    res.status(500).json({
                        message: 'There was an error when trying to add the task'
                    })
                    throw err
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


export const updateCompletedStatus = (req, res) => {
    //we want to get the user id to make sure it's updated by its owner + it's parent id because we'll need it later
    const userIdQuery= `SELECT userId, parentTaskId FROM tasks WHERE id=` + connection.escape(req.params.taskId)
    connection.query(userIdQuery, async (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when fetching the userId for this task'
            })
            throw err
        }
        if (!req.body.ownerToken) {
            res.status(400).json({
                message: 'You need to send an ownerToken with your request'
            })
            return
        }
        const decoded = await jwt.verify(req.body.ownerToken, token)
        const ownerId = decoded.userId
        if (ownerId !== rows[0].userId) {
            res.status(400).json({
                message: 'The id of the user doesn`t match with the id of the owner of this task'
            })
            return
        } else {
            //we update the status with no questions asked
            const parentId = rows[0].parentTaskId
            const updateTask= `UPDATE tasks SET completed=` + connection.escape(req.body.completed) + ` WHERE id=` + connection.escape(req.params.taskId)
            connection.query(updateTask, (err) => {
                if (err) {
                    res.status(500).json({
                        message: 'There was an error when trying to update the complete status of the task'
                    })
                    throw err
                }
                //if the parent id is not null, we want to see if every child of the parent is completed so we can change the status of the parent to completed too
                if (parentId !== null) {
                    //if we changed the status of the child to completed, it may mean that the parent is completed too
                    if (req.body.completed) {
                        const statusQuery= `SELECT (SELECT count(*) FROM tasks WHERE parentTaskId=` + connection.escape(parentId) + ` AND completed=1)=(SELECT count(*) FROM tasks WHERE parentTaskId=` + connection.escape(parentId) + `) as status`
                        connection.query(statusQuery, (err, rows) => {
                            if (err) {
                                res.status(500).json({
                                    message: 'There was an error when trying to check the complete status of all the subtasks'
                                })
                                throw err
                            }
                            if (rows[0].status === 1) {
                                //daca totul a fost in regula la query-ul de deasupra atunci
                                connection.query(`UPDATE tasks SET completed=true WHERE id=${parentId}`)
                                res.json({
                                    message: 'Task successfully updated',
                                    parentCompleteness: rows[0].status
                                })
                            }
                        })
                    } else {
                        //if the child status is not completed, we know for sure that its parent is not completed either
                        const updateParentTask= `UPDATE tasks SET completed=false WHERE id=${parentId}`
                        connection.query(updateParentTask, (err) => {
                            if (err) {
                                res.status(500).json({
                                    message: 'There was a server error when trying to update the complete status of the parent'
                                })
                                throw err
                            } else {
                                res.json({
                                    message: 'Status updated successfully'
                                })
                            }
                        })
                    }
                } else {
                    const updateSubTasks= `UPDATE tasks SET completed=` + connection.escape(req.body.completed) +  ` WHERE parentTaskId=` + connection.escape(req.params.taskId)
                    connection.query(updateSubTasks, (err) => {
                        if (err) {
                            res.status(500).json({
                                message: 'There was a server error when updating the complete status of the children'
                            })
                            throw err
                        }
                        res.json({
                            message: 'The task and its subtasks were updated successfully'
                        })
                    })
                }
            })
        }
    })
}

export const updateTask = (req, res) => {
    let updateFields = []
    //we go through each column to make sure that it's not the completed or userId column because the status we update with the function from before
    // and the user id can't be updated
    //TODO: de rescris partea asta ca sa arate mai curat
    for (const field of req.body.columns.split(" ")) {
        if (!['completed', 'userId'].includes(field)) {
            if (['startTime', 'deadline'].includes(field)) {
                updateFields.push(`${field} = ${connection.escape(req.body[field].replace(/:00\.000.+/, ''))}`)
            } else {
                if(['failed','parentTaskId'].includes(field))
                updateFields.push(`${field} = ${req.body[field]}`)
            }
        } else {
            res.status(400).json({
                message: 'You can`t update the status or the userId here'
            })
            return
        }
    }
    const userIdQuery= `SELECT userId FROM tasks WHERE id=` + connection.escape(req.params.taskId)
    connection.query(userIdQuery, async (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when fetching the userId for this task'
            })
            throw err
        }
        //just the checks to make sure that we have the correct user
        if (!req.body.ownerToken) {
            res.status(400).json({
                message: 'You need to send an ownerToken with your request'
            })
            return
        }
        const decoded = await jwt.verify(req.body.ownerToken, token)
        const ownerId = decoded.userId
        if (ownerId !== rows[0].userId) {
            res.status(400).json({
                message: 'The id of the user doesn`t match with the id of the owner of this task'
            })
            return
        } else {
            //in case everything is fine, we just update the fields
            const updateQuery= `UPDATE tasks SET ${updateFields} WHERE id=` + connection.escape(req.params.taskId)
            connection.query(updateQuery, (err, result) => {
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
    })
}

export const deleteTask = (req, res) => {
    const getUserIdQuery= `SELECT userId FROM tasks WHERE id=` + connection.escape(req.params.taskId)
    connection.query(getUserIdQuery, async (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when fetching the userId for this task'
            })
            throw err
        }
        //we perform the same checks, then delete the task if everything is ok
        if (!req.body.ownerToken) {
            res.status(400).json({
                message: 'You need to send an ownerToken with your request'
            })
            return
        }
        const decoded = await jwt.verify(req.body.ownerToken, token)
        const ownerId = decoded.userId
        if (ownerId !== rows[0].userId) {
            res.status(400).json({
                message: 'The id of the user doesn`t match with the id of the owner of this task'
            })
            return
        } else {
            const deleteQuery= `DELETE FROM tasks WHERE id=` + connection.escape(req.params.taskId)
            connection.query(deleteQuery, (err) => {
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
    })

}

//we use this function to get the children of a task
//this one is used in combination with getUserTasks to fetch the tasks in order for his page
export const getSubtasks = (req, res) => {
    const subtaskQuery= `SELECT * FROM tasks WHERE parentTaskId=` + connection.escape(req.params.taskId)
    connection.query(subtaskQuery, (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to get the subtasks'
            })
            return
        }
        if (!rows[0]) {
            res.json({
                message: 'This task doesn`t have any subtasks'
            })
        } else {
            let results = rows.map(row => {
                return {
                    taskId: row.id,
                    userId: row.userId,
                    parentTaskId: row.parentTaskId,
                    description: row.description,
                    startTime: row.startTime !== null ? row.startTime.toISOString().replace(/:00\.000.+/, '') : row.startTime,
                    deadline: row.deadline !== null ? row.deadline.toISOString().replace(/:00\.000.+/, '') : row.deadline,
                    completed: row.completed === 1,
                    failed: row.failed === 1
                }
            })
            res.json({
                message: 'Tasks successfully retrieved',
                results: results
            })
        }
    })
}