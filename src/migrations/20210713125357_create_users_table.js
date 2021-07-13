
export const up = async function(knex) {
    if(!await knex.schema.hasTable('users')){
        await knex.schema.createTable('users', function(table){
            table.increments()
            table.string('username')
            table.string('email').notNullable()
            table.string('password').notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
        })
    }


};

export const down = async function(knex) {
    if(await knex.schema.hasTable('users')){
        await knex.schema.dropTable('users')
    }
};
