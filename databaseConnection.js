import credentials from "./databaseCredentials.js"
import mysql from 'mysql'

const connection = mysql.createConnection(credentials)

export default connection