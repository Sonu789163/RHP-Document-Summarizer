import React, { useState } from 'react';
import axios from 'axios';

export default function TestPage() {
  const [apiResponse, setApiResponse] = useState('');
  const [apiError, setApiError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  
  const testForgotPasswordApi = async () => {
    if (!testEmail) {
      setApiError('Please enter an email address');
      return;
    }
    
    try {
      setApiResponse('Testing API...');
      setApiError('');
      console.log('Testing forgot password API with email:', testEmail);
      
      const API_URL = import.meta.env.VITE_API_URL;
      console.log('API URL:', API_URL);
      console.log('Making API request to:', `${API_URL}/auth/forgot-password`);
      
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: testEmail
      });
      
      console.log('API Response:', response.data);
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('API Error:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        setApiError(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Error request:', error.request);
        setApiError('No response received from server');
      } else {
        setApiError(error.message || 'An error occurred');
      }
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-xl w-full">
        <h1 className="text-4xl font-bold mb-4">Test Page</h1>
        <p className="mb-4">This is a test page to verify the forgot password functionality.</p>
        
        <div className="mb-8 p-4 border rounded">
          <h2 className="text-2xl font-bold mb-4">Test Forgot Password API</h2>
          <div className="mb-4">
            <input 
              type="email" 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test"
              className="w-full p-2 border rounded mb-2"
            />
            <button 
              onClick={testForgotPasswordApi}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Forgot Password API
            </button>
          </div>
          
          {apiResponse && (
            <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-left">
              <h3 className="font-bold">API Response:</h3>
              <pre className="whitespace-pre-wrap">{apiResponse}</pre>
            </div>
          )}
          
          {apiError && (
            <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-left">
              <h3 className="font-bold">API Error:</h3>
              <pre className="whitespace-pre-wrap">{apiError}</pre>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <a 
              href="/" 
              className="text-blue-500 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log('Navigating to home');
                window.location.href = '/';
              }}
            >
              Go to Home
            </a>
          </div>
          <div>
            <a 
              href="/login" 
              className="text-blue-500 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log('Navigating to login');
                window.location.href = '/login';
              }}
            >
              Go to Login
            </a>
          </div>
          <div>
            <a 
              href="/forgot-password" 
              className="text-blue-500 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log('Navigating to forgot password');
                window.location.href = '/forgot-password';
              }}
            >
              Go to Forgot Password
            </a>
          </div>
          <div>
            <a 
              href="/reset-password?token=test-token&email=test@example.com" 
              className="text-blue-500 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log('Navigating to reset password');
                window.location.href = '/reset-password?token=test-token&email=test@example.com';
              }}
            >
              Go to Reset Password (Test Link)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}