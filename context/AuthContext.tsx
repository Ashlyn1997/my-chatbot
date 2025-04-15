"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession, SessionProvider } from "next-auth/react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  image?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      refetchInterval={0} 
      refetchOnWindowFocus={false} 
      refetchWhenOffline={false}
    >
      <AuthContextContent>{children}</AuthContextContent>
    </SessionProvider>
  );
}

function AuthContextContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const isLoading = status === "loading";

  useEffect(() => {
    // 如果 session 中没有数据但 status 不是 loading，尝试从我们的代理接口获取
    const fetchSession = async () => {
      if (!session && status !== "loading") {
        try {
          const res = await fetch('/api/auth/fix-session', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser({
                id: data.user.id as string,
                name: data.user.name as string,
                email: data.user.email as string,
                role: (data.user.role as "user" | "admin") || "user",
                image: data.user.image || undefined,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching session:", error);
        }
      }
    };

    if (session?.user) {
      setUser({
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        role: (session.user.role as "user" | "admin") || "user",
        image: session.user.image || undefined,
      });
    } else {
      setUser(null);
      // 尝试从替代接口获取
      fetchSession();
    }
  }, [session, status]);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}