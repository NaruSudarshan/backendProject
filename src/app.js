import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'


const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

// middlewares
// securtiy practise
// put limit on json data sent by frontend
app.use(express.json({
    limit : "16kb"
}))

//data from url
app.use(express.urlencoded({
    limit : "16kb"
}))

//to keep public assets
app.use(express.static("public"))

//safely perform crud on user browser cookies
app.use(cookieParser())

export { app }