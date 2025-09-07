import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
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
    // console.log("email: ",email)

    // if(fullName === ""){
    //     throw new ApiError(400,"fullName is required")
    // }
    if(
        [fullName,email,username,password].some((field) => field?.trim() === "")
    )
        {
            throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or : [ { username } , { email } ]
    })
    if(existedUser) {
        throw new ApiError(409,"User with email or username already exist")
    }

    // from multer
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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
        coverImage : coverImage?.url || "",
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

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        const refreshToken = user.generateRefershToken()
        const accessToken = user.generateAccessToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return{accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"error while generating tokens")
    }
}

const loginUser = asyncHandler ( async(req,res) => {
    // req body -> data
    // username or email for login
    // find the user
    // check password
    // generate tokens 
    // return as cookies

    const {username,email,password} = req.body
    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{email},{username}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Password incorrect")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    // the above user is queried before updating refreshToken so its still empty
    // so query again

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
        // only server can modify cookies
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )
})


const logoutUser = asyncHandler ( async(req,res) => {
    // reset access and refresh tokens
    // remove cookies
    // we dont know userId to reset tokens so using middleware we add a object in req (req.user)
    const userId = req.user._id
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken: undefined
            }
        },{
            new: true
        }
    )

    const options = {
        // only server can modify cookies
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logged Out")
    )

})

export {
    registerUser,
    loginUser,
    logoutUser
} 