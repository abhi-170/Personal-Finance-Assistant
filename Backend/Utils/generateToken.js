import jwt from 'jsonwebtoken';

const tokenGenerator= (id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:'3d',
    });
};

export default tokenGenerator;