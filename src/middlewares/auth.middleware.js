// we need this middleware to logout 
// we need userId to logout
// wn user is logged in we can access cookies,
// before sending req to logout decode cookie and add
// req.user in req and send so that logout can access userId

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
import { User } from '../models/user.models.js'

export const verifyJWT = asyncHandler( async (req, _ , next) => {
    try {
        const token = req.cookies?.accessToken || 
        req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401,"Unathorized request")
        }
    
        const decodeToken = await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodeToken._id)
        .select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token")
    }
})