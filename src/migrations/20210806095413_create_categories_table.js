
export const up = async (knex) => {
    if(!await knex.schema.hasTable('categories')){
        await knex.schema.createTable('categories', function (table) {
            table.increments()
            table.string('name')
        })
    }
};

export const down = async (knex) => {
    if(await knex.schema.hasTable('categories')){
        await knex.schema.dropTable('categories')
    }
};
