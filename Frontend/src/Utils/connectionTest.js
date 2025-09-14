// Simple utility to test backend connection
export const testBackendConnection = async () => {
    try {
        const response = await fetch('http://localhost:8080/', {
            method: 'GET',
        });

        if (response.ok) {
            const text = await response.text();
            console.log('Backend connection test successful:', text);
            return true;
        } else {
            console.error('Backend responded with error:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Backend connection test failed:', error.message);
        return false;
    }
};

export const testAPIConnection = async () => {
    try {
        // Test without auth first
        const response = await fetch('http://localhost:8080/api', {
            method: 'GET',
        });

        console.log('API endpoint test response:', response.status);
        return response.status === 404; // 404 is expected for base API route
    } catch (error) {
        console.error('API connection test failed:', error.message);
        return false;
    }
};