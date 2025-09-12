import {saveUserToDB, getUserByUsernameOrEmail, getUserByID } from '../Repository/userRepository.js';
import passwordHashing from '../Utils/hashPassword.js';
import tokenGenerator from '../Utils/generateToken.js';
import passwordChecker from '../Utils/checkPassword.js';

export const register = async (req, res, next) => {

    const { username, email, password } = req.body;
    try {
   
        const usernameExists = await getUserByUsernameOrEmail(username);
        if (usernameExists) {
            res.status(409);
            throw new Error('Username already exists');
        }

        const emailExists = await getUserByUsernameOrEmail(email);
        if (emailExists) {
            res.status(409);
            throw new Error('Email already registered');
        }

        const hashedPassword = await passwordHashing(password);
        
        const savedUser = await saveUserToDB({
            username, 
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            _id: savedUser._id,
            username: savedUser.username, 
            email: savedUser.email,
            token: tokenGenerator(savedUser._id),
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const userExists = await getUserByUsernameOrEmail(username);
        if (!userExists) {
            res.status(404);
            throw new Error(`Invalid credentials`);
        }

        const passwordMatches = await passwordChecker(password, userExists.password);
        if (!passwordMatches) {
            res.status(401);
            throw new Error(`Invalid credentials`);
        }

        res.status(200).json({
            _id: userExists._id,
            username: userExists.username, 
            email: userExists.email,
            token: tokenGenerator(userExists._id),
        });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req, res, next) => {
    const userID = req.user._id;
    try {
        const user = await getUserByID(userID);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

