import dotenv from "dotenv"
dotenv.config()

// import mongoose from "mongoose"
// import { DB_NAME } from "./constants";
import { app } from "./app.js"
import connectDB from "./db/index.js";



// (async () => {})() // IIFE

/*
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (err) => {
            console.log("Error in app", err)
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.log("Error in DB connection", error)    
    }
})()
*/

connectDB()
.then(() => {
    app.listen( process.env.PORT ||8000 ,() => {
        console.log(`Server is running on port ${process.env.PORT}`)
    } )
})
.catch((err) => {
    console.log("MongoDb connection failed ",err)
})


