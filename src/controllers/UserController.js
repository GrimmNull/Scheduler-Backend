import connection from '../databaseConnection.js'
import bcrypt from 'bcrypt'

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
                    completed: row.completed === 1
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
    console.log('what')
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
    connection.query(`SELECT username, password FROM users WHERE username like '${req.body.username}'`, async (err, rows) => {
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
            if(passwordMatch){
                res.json({
                    message:'Logged in'
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
    if (!minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).send({
            message: 'You didn`t send all the necessary columns'
        })
        return
    }
    connection.query(`SELECT username FROM users WHERE username like '${req.body.username}'`, async (err, rows) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error when trying to search for a duplicate username'
            })
            throw err
        }
        if (rows[0]) {
            res.status(409).send({
                message: 'There is already an user with that username'
            })
        } else {
            const password= await bcrypt.hash(req.body.password,saltRounded)
            connection.query(`INSERT INTO users(username,password,email) VALUES ('${req.body.username}','${password}', '${req.body.email}')`, (err, result) => {
                if (err) {
                    res.status(500).send({
                        message: 'There was a server error when adding the new user'
                    })
                    throw err
                }
                res.status(200).send({
                    message: 'User added successfully',
                    userId: result.insertId
                })
            })
        }
    })
}


export const editUser = (req, res) => {
    if (Object.keys(req.body).length > 1 || minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).send({
            message: 'The selected column doesn`t exist or cannot be updated'
        })
        return
    }
    const column = Object.keys(req.body)[0]
    connection.query(`UPDATE users SET ${column}='${req.body[column]}' WHERE id=${req.params.userId}`, (err) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error when trying to update the user'
            })
            throw err
        }
        res.status(200).send({
            message: 'The user account was updated successfully'
        })

    })
}

export const deleteUser = (req, res) => {
    connection.query(`DELETE FROM users WHERE id=${req.params.userId}`, (err) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error when trying to delete the user'
            })
            throw err
        }
        res.status(200).send({
            message: 'User successfully deleted'
        })

    })
}