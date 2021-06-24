import connection from '../databaseConnection.js'
import secretKey from '../token.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import moment from "moment";

const minimalColumns = ['username', 'password', 'email']
const saltRounded = 10

export const getUserTasks = (req, res) => {
    //we check to see if the requests needs only the tasks without their subtasks, which is used most of the time when loading the tasks page on frontend
    let rootOnlyRequest = ''
    if (req.query.rootOnly) {
        rootOnlyRequest = 'AND parentTaskId is null'
    }
    //we fetch all the tasks (and subtasks if needed) for a user
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
            //we take each row and create an array of objects over which we can iterate
            const results = rows.map(row => {
                return {
                    taskId: row.id,
                    userId: row.userId,
                    parentTaskId: row.parentTaskId,
                    startTime: row.startTime !== null ? row.startTime.toISOString().replace(/:00\.000.+/, '') : row.startTime,
                    deadline: row.deadline !== null ? row.deadline.toISOString().replace(/:00\.000.+/, '') : row.deadline,
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
    connection.query(`SELECT * FROM users WHERE username like '${req.body.username}'`, async (err, rows) => {
        if (err) {
            console.log(err)
            res.status(500).json({
                message: 'There was a server error when checking the existence of user'
            })
            throw err
        }
        if (!rows[0]) {
            res.status(409).json({
                message: 'There is no user with this username'
            })
        } else {
            //we check the password against the hashed one that is in the database
            const passwordMatch = await bcrypt.compare(req.body.password, rows[0].password)
            //we give the user a token that he can use to make requests to the backend
            const token = await jwt.sign({
                userId: rows[0].id
            }, secretKey, {
                expiresIn: '72h'
            })
            if (passwordMatch) {
                res.json({
                    message: 'Logged in',
                    userId: rows[0].id,
                    username: rows[0].username,
                    email: rows[0].email,
                    token: token,
                    expiresAt: moment().add(72, 'hours').format('YYYY-MM-DD HH:mm:ss')
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
    const {username, email, password} = req.body
    //we first check that we have all three columns before we attempt to add the new user
    if (!minimalColumns.every(column => Object.keys(req.body).includes(column))) {
        res.status(400).send({
            message: 'You didn`t send all the necessary columns'
        })
        return
    }

    //we check to see if there is a user with this mail or username
    connection.query(`SELECT username FROM users WHERE username like '${username}' OR email like '${email}'`, async (err, rows) => {
        if (err) {
            res.status(500).json({
                message: 'There was a server error when trying to search for a duplicate username or email'
            })
            throw err
        }
        if (rows[0]) {
            res.status(409).json({
                message: 'There is already an user with that username or email'
            })
        } else {
            //we encrypt the password, then insert the new user into the database
            const encryptedPassword = await bcrypt.hash(password, saltRounded)
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
    //we check firstly if we received a json web token from the user
    if (!req.body.ownerToken) {
        res.status(400).json({
            message: 'You need to send an ownerToken with your request'
        })
        return
    }
    const decoded = await jwt.verify(req.body.ownerToken, secretKey)
    const userId = decoded.userId
    if (parseInt(userId) !== parseInt(req.params.userId)) {
        res.status(400).json({
            message: 'The owner id does not match the id from the link'
        })
        return
    }
    //first we make sure that the updated column is a valid one
    if (Object.keys(req.body).length > 2 || Object.keys(req.body).every(column => {
        return !minimalColumns.includes(column) && column !== 'ownerToken'
    })) {
        res.status(400).json({
            message: 'The selected column doesn`t exist or cannot be updated'
        })
        return
    }
    //we check to see if we have to update the username because we have to make sure there are no duplicates
    if (req.body.username) {
        connection.query(`SELECT * from users WHERE username like '${req.body.username}'`, (err, rows) => {
            if (err) {
                res.status(500).json({
                    message: 'There was an error when trying to search for a duplicate username'
                })
                throw err
            }
            if (rows[0]) {
                res.status(409).json({
                    message: 'There is already someone with that username'
                })
            } else {
                connection.query(`UPDATE users SET username='${req.body.username}' WHERE id=${userId}`, (err) => {
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
        })
    } else if (req.body.email) { //same thing with the email address
        connection.query(`SELECT * from users WHERE email like '${req.body.email}'`, (err, rows) => {
            if (err) {
                res.status(500).json({
                    message: 'There was an error when trying to search for a duplicate email'
                })
                throw err
            }
            if (rows[0]) {
                res.status(409).json({
                    message: 'There is already someone with that email'
                })
            } else {
                connection.query(`UPDATE users SET email='${req.body[column]}' WHERE id=${userId}`, (err) => {
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
        })
    } else {
        const encryptedPassword = await bcrypt.hash(req.body.password, saltRounded)
        connection.query(`UPDATE users SET password='${encryptedPassword}' WHERE id=${userId}`, (err) => {
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