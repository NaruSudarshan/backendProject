// once file is in our server upload it to cloudinary

import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from "path";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        localFilePath = path.resolve(localFilePath);
        console.log(localFilePath)
        if (!localFilePath) return null
        // upload to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // console.log("Upload response:", response);
        //file has been uploaded sucessfully
        console.log('file has been uploaded to cloudinary', response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        // console.log("cloudinary upload failed ",error)
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file
        return null
    }
}

export { uploadOnCloudinary }