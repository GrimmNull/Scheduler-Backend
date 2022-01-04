import {bookshelfConn} from "../databaseConnection.js";
import Task from './Task.js'
const Category = bookshelfConn.Model.extend({
    tableName: 'categories',
    tasks(){
        return this.belongsToMany(Task, 'task_categories', 'categoryId', 'taskId')
    }
})

export default Category