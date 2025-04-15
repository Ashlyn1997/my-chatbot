import prisma from '@/lib/prisma';
import { User, Account } from '@/lib/generated/prisma';

// Re-export Prisma types for type compatibility
export type { User, Account };

// Define an interface for the User model methods
export interface UserModelInterface {
  findByEmail: (email: string) => Promise<User | null>;
}

// Create a UserModel object with methods
const UserModel: UserModelInterface = {
  // Method to find a user by email
  findByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });
  }
};

export default UserModel; 