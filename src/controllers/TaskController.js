import {bookshelfConn} from "../databaseConnection.js";
import token from '../token.js'
import jwt from 'jsonwebtoken'
import Task from '../models/Task.js'
import User from "../models/User.js";

export const getTaskById = async (req, res) => {
    const task = (await new Task({id: req.params.taskId}).fetch({
        require: false,
        withRelated: {
            categories: q => {
                q.select('id', 'name')
            }
        }
    })).toJSON()

    if (!task) {
        res.status(404).json({
            message: 'There is no task with this id'
        })
    }
    res.json({
        message: 'Task found successfully',
        description: task.description,
        startTime: task.startTime.toISOString().replace(/:00\.000.+/, ''),
        deadline: task.deadline.toISOString().replace(/:00\.000.+/, ''),
        categories: task.categories
    })

}

export const getUserTasks = async (req, res) => {

    const tasks = (await new Task().query(q => {
        q.where('tasks.userId', req.params.userId)
        q.where('tasks.parentTaskId', null)
    }).fetchAll({
        require: false,
        columns: ['id', 'userId', 'parentTaskId', 'description', 'startTime', 'deadline', 'completed', 'failed'],
        withRelated: {
            subtasks: q => {
                q.select('id', 'userId', 'parentTaskId', 'description', 'startTime', 'deadline', 'completed', 'failed')
            },
            categories: q => {
                q.select('id', 'name')
            },
            'subtasks.categories': q => {
                q.select('id','name')
            }
        }
    })).toJSON()
    const userTasks = tasks.map(task => {
        let result = []
        result.push({
            taskId: task.id,
            userId: task.userId,
            parentTaskId: null,
            description: task.description,
            startTime: task.startTime,
            deadline: task.deadline,
            completed: task.completed,
            failed: task.failed,
            categories: task.categories
        })
        if (task.subtasks.length > 0) {
            result.push(task.subtasks.map(subtask => {

                return {
                    taskId: subtask.id,
                    userId: subtask.userId,
                    parentTaskId: subtask.parentTaskId,
                    description: subtask.description,
                    startTime: subtask.startTime,
                    deadline: subtask.deadline,
                    completed: subtask.completed,
                    failed: subtask.failed,
                    categories: subtask.categories
                }
            }))
        }

        return result.flat(1)
    })
    res.status(200).json({
        message: 'The tasks were retrieved successfully',
        results: userTasks.flat(1)
    })
}

Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

export const getTasksForDay = async (req, res) => {
    const tasksStartDate = new Date(req.query.from)
    const tasksEndDate = new Date(req.query.to)
    // tasksEndDate.setDate(tasksStartDate.getDate()+42)
    if (tasksStartDate instanceof Date && isNaN(tasksStartDate)) {
        res.status(400).json({
            message: 'There is no data attached to this request'
        })
        return
    }

    const tasks = (await new Task().query(q => {
        q.where('tasks.userId', req.params.userId)
        q.whereRaw(`DATE_FORMAT(DATE(tasks.deadline),'%Y-%m-%d')>=DATE_FORMAT('${tasksStartDate.toISOString()}', '%Y-%m-%d') AND 
        DATE_FORMAT(DATE(tasks.deadline),'%Y-%m-%d')<=DATE_FORMAT('${tasksEndDate.toISOString()}', '%Y-%m-%d')`)
    }).fetchAll({
        require: false,
        columns: ['description', 'completed', 'startTime', 'deadline']
    })).toJSON()

    res.json({
        message: 'Tasks fetched successfully',
        results: tasks
    })

}

export const addTask = async (req, res) => {
    const {ownerToken, parentTaskId, startTime, deadline, description} = req.body
    if (!ownerToken) {
        res.status(400).json({
            message: 'You need to send an ownerToken with your request'
        })
        return
    }
    const decoded = await jwt.verify(ownerToken, token)
    const ownerId = decoded.userId
    const user = await new User({id: parseInt(ownerId)}).fetch({
        require: false,
        columns: ['username']
    })
    if (!user) {
        res.status(404).json({
            message: 'There is no user with this id'
        })
        return
    }
    const fields = ['userId', 'parentTaskId', 'completed', 'failed', 'description', 'startTime', 'deadline'],
        values = [ownerId, parentTaskId, false, false, description, startTime.split('.')[0], deadline.split('.')[0]]

    const addBody = values.reduce(function (result, field, index) {
        result[fields[index]] = field;
        return result;
    }, {})
    const newTask = await Task.forge(addBody).save(null, {method: 'insert'})
    res.json({
        message: 'Task successfully added',
        taskId: newTask.id,
        ownerId: ownerId,
        startTime: startTime,
        deadline: deadline,
        description: description,
        finished: false
    })
}

export const updateCompletedStatus = async (req, res) => {
    const task = await new Task({id: req.params.taskId}).fetch({
        require: false
    })
    const decoded = await jwt.verify(req.body.ownerToken, token)
    const ownerId = decoded.userId
    if (parseInt(ownerId) !== parseInt(task.get('userId'))) {
        res.status(400).json({
            message: 'The id of the user doesn`t match with the id of the owner of this task'
        })
        return
    }
    await task.save({completed: req.body.completed}, {method: 'update', patch: true})
    if (task.get('parentTaskId')) {
        if (req.body.completed) {
            const statusResult = await new Task().query(q =>
                q.select(bookshelfConn.knex.raw(`(SELECT count(*) FROM tasks WHERE parentTaskId=${task.get('parentTaskId')} AND completed=1)=(SELECT count(*) FROM tasks WHERE parentTaskId=${task.get('parentTaskId')}) as status`))
            ).fetch({
                require: false
            })
            if (parseInt(statusResult.get('status')) === 1) {
                await new Task({id: task.get('parentTaskId')}).save({completed: true}, {method: 'update', patch: true})
            }

        } else {
            await new Task({id: task.get('parentTaskId')}).save({completed: false}, {method: 'update', patch: true})
        }
    } else {
        const subtasks = await new Task({parentTaskId: task.id}).fetchAll({
            require: false
        })
        if (subtasks) {
            subtasks.map(subtask => subtask.save({completed: false}, {method: 'update', patch: true}))
        }
    }
    res.json({
        message: 'Status updated successfully'
    })
}

export const updateTask = async (req, res) => {
    let updateFields = {}
    for (const field of req.body.columns.split(" ")) {
        if (['startTime', 'deadline', 'description'].includes(field)) {
            if (!['description'].includes(field)) {
                updateFields[field] = req.body[field].split('.')[0]
            } else {
                updateFields[field] = req.body[field]
            }
        } else {
            res.status(400).json({
                message: 'You can`t update that column'
            })
            return
        }
    }
    const task = await new Task({id: req.params.taskId}).fetch({
        require: false,
        columns: ['id', 'userId', 'parentTaskId', 'description', 'startTime', 'deadline']
    })
    const decoded = await jwt.verify(req.body.ownerToken, token)
    const ownerId = decoded.userId
    if (parseInt(ownerId) !== parseInt(task.get('userId'))) {
        res.status(400).json({
            message: 'The id of the user doesn`t match with the id of the owner of this task'
        })
        return
    }
    await task.save(updateFields, {method: 'update', patch: 'true'})
    res.json({
        message: 'The task was updated successfully'
    })
}

export const updateCategories = async (req, res) => {
    const {ownerToken, actions} = req.body

    const task = await new Task({id: req.params.taskId}).fetch({
        require: false,
        withRelated: {
            categories: q => {
                q.select('id', 'name')
            }
        }
    })
    const decoded = await jwt.verify(ownerToken, token)
    const ownerId = decoded.userId
    if (parseInt(ownerId) !== parseInt(task.get('userId'))) {
        return res.status(400).json({
            message: 'You do not have permission to update the categories of this task'
        })
    }

    if (!task) {
        res.status(404).json({
            message: 'There is no task with this id'
        })
    }
    await bookshelfConn.transaction(async t => {
        for (const action of actions) {
            if (action.type === 'add') {
                await new Task({id: req.params.taskId}).categories().attach(action.categoryId, {transacting: t})
            } else if (action.type === 'remove') {
                await new Task({id: req.params.taskId}).categories().detach(action.categoryId, {transacting: t})
            }
        }
    })
    const updatedTask = await new Task({id: req.params.taskId}).fetch({
        require: false,
        withRelated: {
            categories: q => {
                q.select('id', 'name')
            }
        }
    })
    res.json({
        message: 'Task information and categories successfully updated',
        result: updatedTask
    })
}

export const deleteTask = async (req, res) => {
    const task = (await new Task({id: req.params.taskId}).fetch({
        require: false
    }))
    const decoded = await jwt.verify(req.body.ownerToken, token)
    const ownerId = decoded.userId
    if (parseInt(ownerId) !== parseInt(task.get('userId'))) {
        res.status(400).json({
            message: 'You do not have permission to delete this task'
        })
        return
    }
    await bookshelfConn.transaction(async t => {
        const subtasks = await new Task().query(q => {
            q.where('tasks.parentTaskId', task.id)
        }).fetchAll({
            require: false
        })
        if (subtasks.toJSON().length) {
            await Promise.all(subtasks.map(subtask => new Task({id: subtask.id}).categories().detach(subtask.related('categories').map(category => category.id),{transacting: t})))
            await Promise.all(subtasks.map(subtask => subtask.destroy({transacting: t})))
        }
        await new Task({id: task.id}).categories().detach(task.related('categories').map(category => category.id), {transacting: t})
        await task.destroy({transacting: t})

    })
    res.json({
        message: 'Task was successfully deleted'
    })
}