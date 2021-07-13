import {bookshelfConn} from "../databaseConnection.js";
import User from './User.js'

const Task = bookshelfConn.Model.extend({
    tableName: 'tasks',
    subtasks(){
        return this.hasMany(Task, 'parentTaskId', 'id')
    },
    parentTask(){
      return this.hasOne(Task,'parentTaskId','id')
    },
    user(){
        return this.hasOne(User, 'userId', 'id')
    }
})

export default Task