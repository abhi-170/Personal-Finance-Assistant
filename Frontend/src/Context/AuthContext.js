import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../Services/api.js';

const AuthContext = createContext();

const initialState = {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: action.payload,
            };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');

            if (token && user) {
                try {
                    const response = await authAPI.getProfile();
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            user: response.data.user,
                            token,
                        },
                    });
                } catch (error) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            // Backend returns user data directly, not wrapped in 'data'
            const user = {
                id: response.data._id,
                name: response.data.username,
                email: response.data.email,
            };
            const token = response.data.token;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user, token },
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            // Backend returns user data directly, not wrapped in 'data'
            const user = {
                id: response.data._id,
                name: response.data.username,
                email: response.data.email,
            };
            const token = response.data.token;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user, token },
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Registration failed',
            };
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
        // Return a promise to ensure state is updated before navigation
        return Promise.resolve();
    };

    const updateUser = (userData) => {
        const updatedUser = { ...state.user, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    };

    const value = {
        ...state,
        login,
        register,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};