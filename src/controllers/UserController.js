import connection from '../databaseConnection.js'
import secretKey from '../token.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import moment from "moment";
const minimalColumns = ['username', 'password', 'email']
const saltRounded=10

export const getUserTasks = (req, res) => {
    let rootOnlyRequest=''
    if(req.query.rootOnly){
        rootOnlyRequest='AND parentTaskId is null'
    }
    connection.query(`SELECT * FROM tasks WHERE userId=${req.params.userId} ${rootOnlyRequest} ORDER BY parentTaskId ASC`, (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error'
            })
            throw err
        }
        if (!rows[0]) {
            res.status(404).json({
                message: 'There is no user with this id or the user doesn`t have any tasks'
            })
        } else {
            const results = rows.map(row => {
                return {
                    taskId: row.id,
                    userId: row.userId,
                    parentTaskId: row.parentTaskId,
                    startTime: row.startTime,
                    deadline: row.deadline,
                    description: row.description,
                    completed: row.completed === 1,
                    failed: row.failed === 1
                }
            })
            res.json({
                message: 'Tasks successfully returned',
                results: results
            })
        }
    })
}

export const getUserById = (req, res) => {
    connection.query(`SELECT id,username,email FROM users WHERE id=${req.params.userId}`, (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error'
            })
            throw err
        }
        if (!rows[0]) {
            res.status(404).json({
                message: 'There is no user with this id'
            })
        } else {
            res.json({
                message: 'User retrieved successfully',
                id: rows[0].id,
                username: rows[0].username,
                email: rows[0].email
            })
        }
    })
}

export const checkCredentials = (req, res) => {
    connection.query(`SELECT id,username, password FROM users WHERE username like '${req.body.username}'`, async (err, rows) => {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: 'There was a server error when checking the existence of user'
            })
            throw err
        }
        if(!rows[0]){
            res.status(409).json({
                message: 'There is no user with this username'
            })
        } else {
            const passwordMatch=  await bcrypt.compare(req.body.password, rows[0].password)
            const token= await jwt.sign({
                userId: rows[0].id
            },secretKey,{
                expiresIn: '72h'
            })
            if(passwordMatch){
                res.json({
                    message:'Logged in',
                    userId: rows[0].id,
                    username: rows[0].username,
                    token: token,
                    expiresAt: moment().add(72,'hours').format('YYYY-MM-DD HH:mm:ss')
                })
            } else {
                res.status(400).json({
                    message: 'Incorrect password'
                })
            }
        }
    })
}

export const addUser = (req, res) => {
    const {username,email,password} = req.body
    if (!minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).send({
            message: 'You didn`t send all the necessary columns'
        })
        return
    }
    connection.query(`SELECT username FROM users WHERE username like '${username}' OR email like '${email}'`, async (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to search for a duplicate username'
            })
            throw err
        }
        if (rows[0]) {
            res.status(409).json({
                message: 'There is already an user with that username'
            })
        } else {
            const encryptedPassword= await bcrypt.hash(password,saltRounded)
            connection.query(`INSERT INTO users(username,password,email) VALUES ('${username}','${encryptedPassword}', '${email}')`, (err, result) => {
                if (err) {
                    res.status(500).json({
                        message: 'There was a server error when adding the new user'
                    })
                    throw err
                }
                res.json({
                    message: 'User added successfully',
                    userId: result.insertId
                })
            })
        }
    })
}


export const editUser = async (req, res) => {
    if(!req.body.ownerToken){
        res.status(400).json({
            message: 'You need to send an ownerToken with your request'
        })
        return
    }
    const decoded = await jwt.verify(req.body.ownerToken, secretKey)
    const userId = decoded.userId
    if (ownerId !== rows[0].userId) {
        res.status(400).json({
            message: 'The id of the user doesn`t match with the id of the owner of this task'
        })
        return
    }
    if (Object.keys(req.body).length > 1 || minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).json({
            message: 'The selected column doesn`t exist or cannot be updated'
        })
        return
    }
    const column = Object.keys(req.body)[0]
    connection.query(`UPDATE users SET ${column}='${req.body[column]}' WHERE id=${userId}`, (err) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to update the user'
            })
            throw err
        }
        res.json({
            message: 'The user account was updated successfully'
        })

    })
}

export const deleteUser = (req, res) => {
    connection.query(`DELETE FROM users WHERE id=${req.params.userId}`, (err) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to delete the user'
            })
            throw err
        }
        res.status(200).json({
            message: 'User successfully deleted'
        })

    })
}