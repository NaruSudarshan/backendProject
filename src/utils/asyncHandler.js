//wrapper function for async 
const asyncHandler = (requestHandler) => {
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next))
        .catch((err) => next(err))
    }
}

export {asyncHandler}

// using try catch
// const asuncHandler = (fn) => async( req , res , next ) => {
//     try {
        
//     } catch (error) {
//         res.stause(error.code || 500).json({
//             success:false,
//             message: error.message
//         }) 
//     }
// }