// once file is in our server upload it to cloudinary

import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
        //file has been uploaded sucessfully
        console.log('file has been uploaded to cloudinary',response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file
        return null
    }
}

export {uploadOnCloudinary}