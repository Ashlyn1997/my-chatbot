"use client";

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function ClientAuthTest() {
  const { data: session, status } = useSession();
  const [sessionJson, setSessionJson] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/fix-session', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setSessionJson(JSON.stringify(data, null, 2));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchSession();
  }, []);

  return (
    <div className="p-4 border border-gray-200 rounded-md bg-white mb-4">
      <h3 className="text-lg font-semibold mb-2">NextAuth Debug</h3>
      
      <div className="mb-4">
        <p>Status: <span className="font-medium">{status}</span></p>
        {session ? (
          <p>Logged in as: {session.user?.name || session.user?.email}</p>
        ) : (
          <p>Not logged in</p>
        )}
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Raw Session API Response:</h4>
        {error ? (
          <div className="text-red-500 my-2">Error: {error}</div>
        ) : (
          <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs max-h-48">
            {sessionJson || 'Loading...'}
          </pre>
        )}
      </div>

      <div className="flex gap-2">
        {!session ? (
          <button 
            onClick={() => signIn()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign in
          </button>
        ) : (
          <button 
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
} 