'use client';
import { useEffect } from 'react';

const API_OPCUA = () => {
    useEffect(() => {
        setTimeout(() => {
            window.location.href = `${window.location.origin}/Dashboard`;
        }, 3000); // Adjust the time as needed (3 seconds in this case)
    }, []);

    return (
        <div>
            <div className="flex justify-center items-center h-screen">
                your opcua server is running, you will be redirected to the dashboard in 3 seconds
            </div>
        </div>
    );
};

export default API_OPCUA;