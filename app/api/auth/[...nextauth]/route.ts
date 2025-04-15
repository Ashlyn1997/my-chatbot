import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import UserModel from "@/models/User";
import prisma from "@/lib/prisma";

// Rate limiting utils
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Custom types for NextAuth
declare module "next-auth" {
  interface User {
    role?: string;
  }
  
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

// Extend the default JWT token
declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide both email and password");
        }

        // Find user by email with password included
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Check if account is locked
        if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
          const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account is locked. Try again in ${remainingTime} minutes`);
        }

        // Reset lock if lock has expired
        if (user.isLocked && user.lockUntil && user.lockUntil <= new Date()) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isLocked: false,
              loginAttempts: 0
            }
          });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        // If password is not valid, increment login attempts
        if (!isPasswordValid) {
          const newLoginAttempts = (user.loginAttempts || 0) + 1;
          const now = new Date();
          
          // Update user with new login attempts and possibly lock
          if (newLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: newLoginAttempts,
                lastLoginAttempt: now,
                isLocked: true,
                lockUntil: new Date(Date.now() + LOCK_TIME)
              }
            });
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: newLoginAttempts,
                lastLoginAttempt: now
              }
            });
          }
          
          throw new Error(`Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newLoginAttempts} attempts remaining.`);
        }

        // Reset login attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            isLocked: false
          }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET as string,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 