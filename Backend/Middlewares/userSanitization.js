import sanitize from "sanitize-html";

const userSanitizer = (req, res, next) => {
    const fieldsToSanitize = ['username', 'email'];

    fieldsToSanitize.forEach(field => {
        if (req.body[field]) {
            req.body[field] = sanitize(req.body[field].trim());
        }
    });

    next();
};

export default userSanitizer;

