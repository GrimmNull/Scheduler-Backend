import dotenv from 'dotenv'

dotenv.config()

export default {
    development: {
        client: process.env.DB_CLIENT,
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectTimeout: 60000
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './src/seeds'
        }
    },
    staging: {
        client: process.env.DB_CLIENT,
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectTimeout: 60000
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        pool: {
            min: 2,
            max: 10
        }
    },
    production: {
        client: process.env.DB_CLIENT,
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            connectTimeout: 60000
        },
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        pool: {
            min: 2,
            max: 10
        }
    }
}