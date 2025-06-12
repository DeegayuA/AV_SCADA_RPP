'use client';
import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const SettingsPage = () => {
  const [backendUrl, setBackendUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadUrl = async () => {
      try {
        const { value } = await Preferences.get({ key: 'backendUrl' });
        if (value) {
          setBackendUrl(value);
          setSavedUrl(value);
        }
      } catch (error) {
        console.error('Failed to load backend URL from preferences', error);
        setMessage('Error: Could not load saved URL.');
      }
    };
    loadUrl();
  }, []);

  const handleSave = async () => {
    try {
      await Preferences.set({ key: 'backendUrl', value: backendUrl });
      setSavedUrl(backendUrl);
      setMessage('Backend URL saved successfully!');
    } catch (error) {
      console.error('Failed to save backend URL to preferences', error);
      setMessage('Error: Could not save URL.');
    }
  };

  return (
    <div style={{ padding: '20px', color: 'black' }}>
      <h1>Mobile App Backend Configuration</h1>
      <p>Current API calls are directed to: <strong>{savedUrl || 'Not set (uses default or app build config)'}</strong></p>
      <input
        type="text"
        value={backendUrl}
        onChange={(e) => setBackendUrl(e.target.value)}
        placeholder="Enter backend URL (e.g., http://localhost:3000)"
        style={{ width: '300px', padding: '8px', marginRight: '10px', border: '1px solid #ccc', color: 'black' }}
      />
      <button onClick={handleSave} style={{ padding: '8px 12px', cursor: 'pointer' }}>
        Save URL
      </button>
      {message && <p>{message}</p>}
      <p style={{ marginTop: '20px', fontSize: '0.9em', color: 'gray' }}>
        Ensure the app is restarted or data is re-fetched after changing the URL for it to take full effect.
        The application will use this URL to make API requests.
      </p>
    </div>
  );
};

export default SettingsPage;
