import bcrypt from "bcryptjs";

const passwordChecker= async(enteredPassword,hashedPassword)=>{
    try{
        return bcrypt.compare(enteredPassword,hashedPassword);
    }catch(error){
        throw new Error(`password checking error ${error}`);
    }
};

export default passwordChecker;