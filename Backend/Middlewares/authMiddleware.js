import jwt from 'jsonwebtoken';
import {getUserByID} from '../Repository/userRepository.js'

const protect = async (req, res, next) => {
    try {
        let authHeader=req.headers.authorization;

        if(authHeader){
           authHeader= authHeader.trim();
        }

        if(!authHeader || !authHeader.startsWith('Bearer ')){
            res.status(401);
            throw new Error ('Authorization token missing');
        }

        const token= authHeader.split(' ')[1];
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        const user=await getUserByID(decoded.id);

        if(!user){
            res.status(401);
            throw new Error (`Invalid user`); 
        }

        req.user=user;
        next();

    } catch (error) {
        res.status(401);
        next(error);
    }
};

export default protect;