import { body, validationResult } from "express-validator";

const userValidator = [
    body('username')
        .notEmpty().withMessage('Username is required.') 
        .trim()
        .isLength({ min: 4, max: 16 })
        .withMessage('Username should be between 4 to 16 characters long'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Email must be valid'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const messages = errors.array().map(err => err.msg).join(', ');
            const error = new Error(messages);
            error.status = 400;
            return next(error);
        }
        next();
    }
];

export default userValidator;

