import connection, {bookshelfConn} from '../databaseConnection.js'
import secretKey from '../token.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import moment from "moment";
import User from '../models/User.js'

const minimalColumns = ['username', 'password', 'email']
const saltRounded = 10

export const getUserById = async (req, res) => {
    const user = await new User({id: req.params.userId}).fetch({
        require: false,
        columns: ['id', 'username', 'email', 'password']
    })
    if (!user) {
        res.status(404).json({
            message: 'There is no user with this id'
        })
        return
    }
    res.json(user.toJSON({omitPivot: true}))
}

export const getUserStats = async (req, res) => {

    let getForMonth= req.body.date ? `WHERE DATE_FORMAT(Date(${req.body.date}),'%Y-%m')=DATE_FORMAT(Date(deadline),'%Y-%m')` : ''

    const stats= await bookshelfConn.knex.raw(`SELECT SUM(completed) AS completedTasks, SUM(completed=0 AND deadline<SYSDATE()) as failedTasks, SUM(completed=0 AND deadline>SYSDATE()) as pendingTasks, SUM(parentTaskId IS NOT null) as numberOfSubtasks, SUM(parentTaskId IS null) as numberOfTasks from tasks ${getForMonth}`)


    res.json({
        tasks: stats[0][0].numberOfTasks,
        subtasks: stats[0][0].numberOfSubtasks,
        completed: stats[0][0].completedTasks,
        failed: stats[0][0].failedTasks,
        pending: stats[0][0].pendingTasks
    })
}

export const checkCredentials = async (req, res) => {
    const user = await (await new User().query(q => {
        q.where('users.username', 'like', `${req.body.username}`)
    }).fetch({
        require: false,
        columns: ['id', 'username', 'email', 'password']
    })).toJSON()
    if (!user) {
        res.status(404).json({
            message: 'There is no user with this username'
        })
        return
    }
    const passwordMatch = await bcrypt.compare(req.body.password, user.password)
    if (passwordMatch) {
        const token = await jwt.sign({
            userId: user.id
        }, secretKey, {
            expiresIn: '72h'
        })
        res.json({
            message: 'Logged in',
            userId: user.id,
            username: user.username,
            email: user.email,
            token: token,
            expiresAt: moment().add(72, 'hours').format('YYYY-MM-DD HH:mm:ss')
        })
    } else {
        res.status(400).json({
            message: 'Incorrect password'
        })
    }
}

export const addUser = async (req, res) => {
    const {username, email, password} = req.body
    if (!minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).send({
            message: 'You didn`t send all the necessary columns'
        })
        return
    }

    const user = await new User().query(q => {
        q.orWhere('users.username', `${username}`)
        q.orWhere('users.email', `${email}`)
    }).fetch({
        require: false,
        columns: ['username', 'email']
    })

    if (user) {
        res.status(409).json({
            message: 'There is already an user with that username or email'
        })
        return
    }

    const encryptedPassword = await bcrypt.hash(password, saltRounded)
    const newUser = await User.forge({
        username: req.body.username,
        email: req.body.email,
        password: encryptedPassword
    }).save(null, {method: 'insert'})

    res.json({
        message: 'Account successfully created',
        userId: newUser.id
    })
}

export const updateUser = async (req, res) => {
    const user = await new User({id: req.params.userId}).fetch({
        require: false
    })
    if (!user) {
        res.status(400).json({
            message: 'There is no user with this id'
        })
        return
    }
    const decoded = await jwt.verify(req.body.ownerToken, secretKey)
    const userId = decoded.userId
    if (parseInt(userId) !== parseInt(req.params.userId)) {
        res.status(400).json({
            message: 'You do not have permission to edit this account'
        })
        return
    }

    if (Object.keys(req.body).length > 2 || Object.keys(req.body).every(column => {
        return !minimalColumns.includes(column) && column !== 'ownerToken'
    })) {
        res.status(400).json({
            message: 'The selected column doesn`t exist or cannot be updated'
        })
        return
    }
    const updatedColumn = Object.keys(req.body).filter(key => key !== 'ownerToken')[0]
    switch (updatedColumn) {
        case 'username': {
            const existingName = await new User().query(q => {
                q.where('users.username', 'like', `${req.body.username}`)
            }).fetch({
                require: false
            })
            if (existingName) {
                res.status(409).json({
                    message: 'There is already an user with that username'
                })
                return
            }
            await user.save({username: req.body.username}, {method: 'update', patch: 'true'})
            res.json({
                message: 'The username was updated successfully'
            })
            return
        }
        case 'email': {
            const existingEmail = await new User().query(q => {
                q.where('users.email', 'like', `${req.body.email}`)
            }).fetch({
                require: false
            })
            if (existingEmail) {
                res.status(409).json({
                    message: 'There is already an user with that email'
                })
                return
            }
            await user.save({email: req.body.email}, {method: 'update', patch: 'true'})
            res.json({
                message: 'The email was updated successfully'
            })
            return
        }
        case 'password': {
            const encryptedPassword = await bcrypt.hash(req.body.password, saltRounded)
            await user.save({password: encryptedPassword}, {method: 'update', patch: 'true'})
            res.json({
                message: 'The password was updated successfully'
            })
            return
        }
        default:
            res.status(400).json({
                message: 'There is no field with that name'
            })
    }
}


export const deleteUser = async (req, res) => {
    const decoded = await jwt.verify(req.body.ownerToken, secretKey)
    const userId = decoded.userId
    if (parseInt(userId) !== parseInt(req.params.userId)) {
        res.status(400).json({
            message: 'The id of the sender doesn`t match the id of the account'
        })
        return
    }

    const user = await new User({id: req.params.userId}).fetch({
        require: false
    })

    if (!user) {
        res.status(404).json({
            message: 'There is no user with this id'
        })
        return
    }
    user.destroy()
    res.json({
        message: 'User successfully deleted'
    })
}