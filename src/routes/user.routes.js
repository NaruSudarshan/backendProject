import { Router } from "express";
import { loginUser, logoutUser, refershAccessToken, registerUser } from '../controllers/user.controller.js'
const router = Router()
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser)

// secured route 
router.route("/logout").post(
    verifyJWT,
    logoutUser)

router.route("/refresh-token").post(refershAccessToken)

export default router