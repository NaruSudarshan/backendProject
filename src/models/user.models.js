import mongoose from 'mongoose'
//jwt is a bearer token -> who ever has the token is conidered legit
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim:true,
        index:true
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true
    },
    fullName : {
        type : String,
        required : true,
        trim:true,
        index:true
    },
    avatar : {
        type : String, // cloudinary url
        required : true,
    },
    coverImage : {
        type : String
    },
    watchHistory : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    }],
    password: {
        type : String,
        required: [true ,"Password is required"]
    },
    refreshToken :{
        type:String
    }
},{timestamps : true})

// here pre(middleware) is used to do something with just before saving
// cannot use arrow funciton because it cannot use this. for context 
// and because this is a middleware we must provide next in end 
userSchema.pre("save",async function(next) {
    //encrypt only wn password field is changes 
    if(!this.isModified("password")) return next()
    // 10 is salt - number of rounds of encryption
    this.password = await bcrypt.hash(this.password,10)
    // encrypt password and go next
    next()
})

// custom method to check password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function() {
    jwt.sign(
        // payload
        {
            _id :this._id,
            email:this.email,
            username :this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefershToken = function() {
    jwt.sign(
        // payload -> keep paylod less because it keeps refreshing
        {
            _id :this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User" , userSchema)