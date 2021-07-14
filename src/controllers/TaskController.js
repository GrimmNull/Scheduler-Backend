import connection from '../databaseConnection.js'
import {bookshelfConn} from "../databaseConnection.js";
import token from '../token.js'
import jwt from 'jsonwebtoken'
import Task from '../models/Task.js'
import User from "../models/User.js";

export const getUserTasks = async (req, res) => {

    const tasks = await (await new Task().query(q => {
        q.where('tasks.userId', req.params.userId)
        q.where('tasks.parentTaskId', null)
    }).fetchAll({
        require: false,
        columns: ['id', 'userId', 'parentTaskId', 'description', 'startTime', 'deadline', 'completed', 'failed'],
        withRelated: [{
            subtasks: q => {
                q.select('id', 'userId', 'parentTaskId', 'description', 'startTime', 'deadline', 'completed', 'failed')
            }
        }]
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
            failed: task.failed
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
                    failed: subtask.failed
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

export const getTodayTasks= async (req,res) => {
    const tasks= await (await new Task().query(q => {
        q.where('tasks.userId',req.params.userId)
        q.whereRaw('DATE(tasks.deadline)=DATE(SYSDATE())')
    }).fetchAll({
        require:false,
        columns: ['id','userId','parentTaskId','description','completed','failed','startTime','deadline']
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
    const fields = parentTaskId ? ['userId', 'parentTaskId', 'completed', 'failed'] : ['userId', 'completed', 'failed'],
        values = parentTaskId ? [connection.escape(ownerId), connection.escape(parentTaskId), false, false] : [connection.escape(ownerId), false, false]

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
    await task.save({completed: req.body.completed}, {method:'update', patch: true})
    if(task.get('parentTaskId')){
        if(req.body.completed){
            const statusResult= await new Task().query(q =>
                q.select(bookshelfConn.knex.raw(`(SELECT count(*) FROM tasks WHERE parentTaskId=${task.get('parentTaskId')} AND completed=1)=(SELECT count(*) FROM tasks WHERE parentTaskId=${task.get('parentTaskId')}) as status`))
            ).fetch({
                require: false
            })
            console.log(statusResult)
            if(parseInt(statusResult.get('status'))===1){
                await new Task({id: task.get('parentTaskId')}).save({completed: true}, {method: 'update', patch: true})
            }

        } else {
            await new Task({id: task.get('parentTaskId')}).save({completed: false}, {method: 'update', patch: true})
        }
    } else {
        const subtasks = await new Task({parentTaskId: task.id}).fetchAll({
            require: false
        })
        if(subtasks){
            subtasks.map(subtask => subtask.save({completed: false}, {method:'update', patch: true}))
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
            await Promise.all(subtasks.map(subtask => subtask.destroy({transacting: t})))
        }
        await task.destroy({transacting: t})

    })
    res.json({
        message: 'Task was successfully deleted'
    })
}