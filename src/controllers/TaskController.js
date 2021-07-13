import connection from '../databaseConnection.js'
import {bookshelfConn} from "../databaseConnection.js";
import token from '../token.js'
import jwt from 'jsonwebtoken'
import Task from '../models/Task.js'

export const getUserTasks = (req, res) => {
    const columns = 'parent.id as parentId, parent.userId as parentUserId,parent.description as parentDescription, parent.startTime as parentStart, parent.deadline as parentDeadline, parent.completed as parentCompleted, parent.failed as parentFailed, subtask.id as subtaskId, subtask.description as subtaskDescription, subtask.startTime as subtaskStart, subtask.deadline as subtaskDeadline, subtask.completed as subtaskCompleted, subtask.failed as subtaskFailed'
    connection.query(`SELECT ${columns} from tasks parent LEFT JOIN tasks subtask ON subtask.parentTaskId=parent.id WHERE parent.parentTaskId IS NULL AND parent.userId=?`, [req.params.userId], (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to fetch the task'
            })
            throw err
        }
        let prevId = -1
        const userTasks = rows.map(row => {
            let result = []
            if (prevId !== row.parentId) {
                prevId = row.parentId
                result.push({
                    taskId: row.parentId,
                    userId: row.parentUserId,
                    parentTaskId: null,
                    description: row.parentDescription,
                    startTime: row.parentStart,
                    deadline: row.parentDeadline,
                    completed: row.parentCompleted,
                    failed: row.parentFailed
                })
            }
            if (row.subtaskId !== null) {
                result.push({
                    taskId: row.subtaskId,
                    userId: row.parentUserId,
                    parentTaskId: row.parentId,
                    description: row.subtaskDescription,
                    startTime: row.subtaskStart,
                    deadline: row.subtaskDeadline,
                    completed: row.subtaskCompleted,
                    failed: row.subtaskFailed
                })
            }

            return result
        })
        res.json({
            message: 'It worked',
            results: userTasks.flat(1)
        })
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
        connection.query(`SELECT username FROM users WHERE id= ?`, [ownerId], (err, rows) => {
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
                    values = parentTaskId ? `(` + connection.escape(ownerId) + `,` + connection.escape(parentTaskId) + `,false)` : `(` + connection.escape(ownerId) + `,false)`
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
                            startTime: startTime,
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
    connection.query(`SELECT userId, parentTaskId FROM tasks WHERE id= ?`, [req.params.taskId], async (err, rows) => {
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
        } else {
            //we update the status with no questions asked
            const parentId = rows[0].parentTaskId
            connection.query(`UPDATE tasks SET completed=? WHERE id=?`, [req.body.completed, req.params.taskId], (err) => {
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
                        connection.query(`SELECT (SELECT count(*) FROM tasks WHERE parentTaskId=? AND completed=1)=(SELECT count(*) FROM tasks WHERE parentTaskId=?) as status`, [parentId, parentId], (err, rows) => {
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
                        connection.query(`UPDATE tasks SET completed=false WHERE id=?`, [parentId], (err) => {
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
                    connection.query(`UPDATE tasks SET completed=? WHERE parentTaskId=?`, [req.body.completed, req.params.taskId], (err) => {
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
    for (const field of req.body.columns.split(" ")) {
        if (['startTime', 'deadline', 'description'].includes(field)) {
            if (!['description'].includes(field)) {
                updateFields.push(`${field} = ${connection.escape(req.body[field].split('.')[0])}`)
            } else {
                updateFields.push(`${field} = ${connection.escape(req.body[field])}`)
            }
        } else {
            res.status(400).json({
                message: 'You can`t update that column'
            })
            return
        }


    }
    connection.query(`SELECT userId FROM tasks WHERE id=?`, [req.params.taskId], async (err, rows) => {
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
        } else {
            //in case everything is fine, we just update the fields
            connection.query(`UPDATE tasks SET ${updateFields} WHERE id=?`, [req.params.taskId], (err, result) => {
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

export const deleteTask = async (req, res) => {
    const task = (await new Task({id: req.params.taskId}).fetch({
        require: false
    }))
    const decoded = await jwt.verify(req.body.ownerToken, token)
    const ownerId = decoded.userId
    if (parseInt(ownerId)!==parseInt(task.get('userId'))) {
        res.status(400).json({
            message: 'You do not have permission to delete this task'
        })
        return
    }
    await bookshelfConn.transaction(async t => {
        const subtasks=await new Task({parentTaskId: task.id}).fetchAll({
            require: false
        })
        if(subtasks.toJSON().length){
           await Promise.all(subtasks.map(subtask => subtask.destroy({transacting: t})))
        }
        await new Task({id: Number(task.id)}).destroy({transacting: t})
    })
    res.json({
        message: 'Task was successfully deleted'
    })
}