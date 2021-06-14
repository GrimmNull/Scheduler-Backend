import connection from '../databaseConnection.js'

const minimalColumns = ['username', 'password', 'email']

export const getUserTasks = (req, res) => {
    connection.query(`SELECT * FROM tasks WHERE userId=${req.params.userId}`, (err, rows) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error'
            })
            return
        }
        if (!rows[0]) {
            res.status(404).send({
                message: 'There is no user with this id'
            })
        } else {
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
        }
    })
}

export const getUserById = (req, res) => {
    connection.query(`SELECT id,username,email FROM users WHERE id=${req.params.userId}`, (err, rows) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error'
            })
            return
        }
        if (!rows[0]) {
            res.status(404).send({
                message: 'There is no user with this id'
            })
        } else {
            res.status(200).send({
                message: 'User retrieved successfully',
                id: rows[0].id,
                username: rows[0].username,
                email: rows[0].email
            })
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
    connection.query(`SELECT username FROM users WHERE username like '${req.body.username}'`, (err, rows) => {
        if (err) {
            res.status(500).send({
                message: 'There was a server error when trying to search for a duplicate username'
            })
            return
        }
        if (rows[0]) {
            res.status(409).send({
                message: 'There is already an user with that username'
            })
        } else {
            connection.query(`INSERT INTO users(username,password,email) VALUES ('${req.body.username}','${req.body.password}', '${req.body.email}')`, (err, result) => {
                if (err) {
                    res.status(500).send({
                        message: 'There was a server error when adding the new user'
                    })
                } else {
                    console.log(result)
                    res.status(200).send({
                        message: 'User added successfully'
                    })
                }
            })
        }
    })
}


export const editUser = (req, res) => {
    if(Object.keys(req.body).length>1 || minimalColumns.every(column => Object.keys(req.body).includes(column))){
        res.status(400).send({
            message: 'The selected column doesn`t exist or cannot be updated'
        })
        return
    }
    const column=Object.keys(req.body)[0]
    connection.query(`UPDATE users SET ${column}='${req.body[column]}' WHERE id=${req.params.userId}`, (err) => {
        if(err){
            res.status(500).send({
                message: 'There was a server error when trying to update the user'
            })
        } else {
            res.status(200).send({
                message: 'The user account was updated successfully'
            })
        }
    })
}

export const deleteUser = (req,res) => {
    connection.query(`DELETE FROM users WHERE id=${req.params.userId}`, (err) => {
        if(err){
            res.status(500).send({
                message: 'There was a server error when trying to delete the user'
            })
        } else {
            res.status(200).send({
                message: 'User successfully deleted'
            })
        }
    })
}