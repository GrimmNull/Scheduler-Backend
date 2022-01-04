
export const up = async (knex) => {
    if(!await knex.schema.hasTable('task_categories')){
        await knex.schema.createTable('task_categories', function (table) {
            table.integer('taskId').unsigned().references('tasks.id')
            table.integer('categoryId').unsigned().references('categories.id')
        })
    }
};

export const down = async (knex) => {
    if(await knex.schema.hasTable('task_categories')){
        await knex.schema.dropTable('task_categories')
    }
};
