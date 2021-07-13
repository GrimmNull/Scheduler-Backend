export const up = async function (knex) {
    if(!await knex.schema.hasTable('tasks')){
        await knex.schema.createTable('tasks', function (table) {
            table.increments()
            table.integer('userId').references('users.id')
            table.integer('parentTaskId').references('tasks.id')
            table.string('description')
            table.boolean('completed').notNullable().defaultTo(false)
            table.boolean('failed').notNullable().defaultTo(false)
            table.timestamp('startTime').defaultTo(knex.fn.now())
            table.timestamp('deadline').defaultTo(knex.fn.now())
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
    }
};

export const down = async function (knex) {
    if(await knex.schema.hasTable('tasks')){
        await knex.schema.dropTable('tasks')
    }
};
