import {bookshelfConn} from "../databaseConnection.js";
import User from './User.js'
import Category from "./Category.js";
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
    },
    categories() {
        return this.belongsToMany(Category,'task_categories','taskId','categoryId')
    }
})

export default Task