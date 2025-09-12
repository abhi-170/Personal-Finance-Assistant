const errorHandler = (err, req, res, next) => {
    console.error("Error caught:", err.message || err);

    const statusCode = err.status || res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};

export default errorHandler;