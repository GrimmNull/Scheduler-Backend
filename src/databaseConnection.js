import mysql from 'mysql'
import dotenv from 'dotenv';
import Knex from "knex";
import bookshelf from 'bookshelf'

dotenv.config()

const credentials = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
}


const knex = Knex({
    client: process.env.DB_CLIENT,
    connection: credentials
})
export const bookshelfConn=bookshelf(knex)

const connection = mysql.createConnection(credentials)

export default connection