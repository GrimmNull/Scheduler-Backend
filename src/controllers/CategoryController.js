import {bookshelfConn} from "../databaseConnection.js";
import Category from "../models/Category.js";

export const getCategories = async (req,res) => {
    const categories= (await new Category().fetchAll({
        require: false
    })).toJSON()
    if(!categories) {
        res.status(404).json({
            message: 'There were no categories found'
        })
        return
    }
    res.json({
        message: 'Categories were returned successfully',
        results: categories
    })
}