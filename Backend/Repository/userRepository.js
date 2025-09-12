import User from "../Models/User.js";

// Creates a new user in the database.
export const saveUserToDB = async ({ username, email, password }) => {
    const newUser = new User({ 
        username: username,
        email: email,
        password: password,
    });
    try {
        return await newUser.save();
    } catch (error) {
        throw new Error(`Error saving user to DB: ${error.message}`);
    }
};

// Finds a user by their ID, excluding the password.
export const getUserByID = async (userID) => {
    try {
        const result = await User.findById(userID).select('-password');
        return result;
    } catch (error) {
        throw new Error(`user fetching error by userID: ${error.message}`);
    }
};

// Finds a user by their username.
export const getUserByUsername = async (username) => {
  try {
    return await User.findOne({ username });
  } catch (error) {
    throw new Error(`Error finding user by username: ${error.message}`);
  }
};

// Checks if a user exists with the given username or email.
export const getUserByUsernameOrEmail = async (username, email) => {
    try {
        return await User.findOne({ $or: [{ username }, { email }] });
    } catch (error) {
        throw new Error(`Error finding user by username or email: ${error.message}`);
    }
};

