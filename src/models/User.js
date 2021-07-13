import {bookshelfConn} from "../databaseConnection.js";
import Task from './Task.js'

const User = bookshelfConn.Model.extend({
    tableName: 'users',
    tasks(){
        return this.hasMany(Task,'userId','id')
    }
})

export default User