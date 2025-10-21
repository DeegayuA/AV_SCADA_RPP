import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import * as bcrypt from "bcryptjs"
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  redirectPath: string;
  password?: string;
}

const usersFilePath = path.join(process.cwd(), 'config', 'users.json');

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }
        const usersData = await fs.readFile(usersFilePath, 'utf-8');
        const users: User[] = JSON.parse(usersData);

        const user = users.find((user) => user.username === credentials.username);

        if (user && user.password && await bcrypt.compare(credentials.password, user.password)) {
          let redirectPath = '/dashboard'; // Default for viewer
          if (user.role === 'admin') {
            redirectPath = '/control';
          } else if (user.role === 'operator') {
            redirectPath = '/maintenance';
          }
          return { id: user.id, name: user.name, role: user.role, redirectPath };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.redirectPath = (user as any).redirectPath;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).redirectPath = token.redirectPath;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }