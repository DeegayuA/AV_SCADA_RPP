import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { decryptUsers, encryptUsers } from '@/lib/user-crypto';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log("--- Authorize Function Start ---");
        if (!credentials) {
          console.log("No credentials provided.");
          console.log("--- Authorize Function End (null) ---");
          return null;
        }
        console.log("Attempting login for email:", credentials.email);

        try {
          const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
          const users = await decryptUsers(encryptedData);
          console.log("Successfully decrypted user file.");

          const user = users ? users[credentials.email] : null;

          if (user) {
            console.log("User found in store:", { email: credentials.email, role: user.role });
            console.log("Comparing provided password with stored hash...");
            const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
            console.log("Password validation result:", isPasswordValid);

            if (isPasswordValid) {
              const authorizedUser = { id: credentials.email, email: credentials.email, role: user.role };
              console.log("Password is valid. Authorizing user:", authorizedUser);
              console.log("--- Authorize Function End (success) ---");
              return authorizedUser;
            } else {
              console.log("Password comparison failed.");
            }
          } else {
            console.log("User not found in store for email:", credentials.email);
          }
        } catch (error) {
          console.error("Error during authorization process:", error);
        }

        console.log("--- Authorize Function End (failure) ---");
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
        const users = await decryptUsers(encryptedData) || {};

        if (!users[user.email!]) {
          users[user.email!] = {
            role: 'viewer', // New Google sign-in users are viewers
          };
          const encryptedUsers = await encryptUsers(users);
          if (encryptedUsers) {
            await fs.writeFile(USERS_PATH, encryptedUsers);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
        const users = await decryptUsers(encryptedData);
        if (users && users[user.email!]) {
          token.role = users[user.email!].role;
        } else if ((user as any).role) {
          token.role = (user as any).role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  }
});

export { handler as GET, handler as POST };