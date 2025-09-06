import { Router } from "express";
import { registerUser } from '../controllers/user.controller.js'
const router = Router()
import {upload} from '../middlewares/multer.middleware.js'

// /users/register
// router.route("/register").post(registerUser)

router.route("/register").post(
    // middleware for avatar and coverPage
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
           name: "coverImage",
            maxCount: 1 
        }
    ]),
    registerUser
)


export default router