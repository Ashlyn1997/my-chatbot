"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if not logged in 
  // This is a client-side fallback - the main protection is in middleware
  useEffect(() => {
    if (!isLoading && !user && isClient) {
      router.push("/login");
    }
  }, [user, isLoading, router, isClient]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  if (isLoading || !isClient) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col items-center p-6 max-w-4xl mx-auto">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center mb-8">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-24 h-24 rounded-full mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <User2 className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-600">{user.email}</p>
          <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {isAdmin ? "Admin" : "User"}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-medium mb-2">Account Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-gray-500 text-sm">User ID:</span>
                <p className="text-sm truncate">{user.id}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Account Type:</span>
                <p>{isAdmin ? "Team Admin (Premium)" : "Basic User (Free)"}</p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <h2 className="font-medium mb-2 text-yellow-800">Admin Features</h2>
              <p className="text-sm text-yellow-700 mb-3">
                As an admin, you have access to additional features:
              </p>
              <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
                <li>Team member management</li>
                <li>Usage analytics</li>
                <li>Custom model configuration</li>
                <li>Advanced API access</li>
              </ul>
              <button
                onClick={() => router.push("/admin")}
                className="mt-3 w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
              >
                Go to Admin Dashboard
              </button>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
} 