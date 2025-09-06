import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError, APiError} from "../utils/ApiError.js"
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res) =>{
    // get details from frontend
    // validation - not empty
    // check if user already exist - useraname,email
    // files - avatar and coverimage
    // uplaod them to cloudinary and check if sucess
    // create user object -> for mongodb -> create entry in db
    // remove password and refreshtoken field from response
    // check for user creation success 
    // return response or error

    // form or json data is in body
    const {fullName,email,username,password} = req.body
    console.log("email: ",email)

    // if(fullName === ""){
    //     throw new ApiError(400,"fullName is required")
    // }
    if(
        [fullName,email,username,password].some((field) => field?.trim() === "")
    )
        {
            throw new ApiError(400,"All fields are required")
    }

    const existedUser = User.findOne({
        $or : [ { username } , { email } ]
    })
    if(existedUser) {
        throw new ApiError(409,"User with email or username already exist")
    }

    // from multer
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    // check if user is created and remove password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new APiError(500 ,"Something went wrong during user creation")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered sucessfully")
    )
} )

export {registerUser} 