import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import db from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "demo" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Hardcoded demo user check for this local app
        if (credentials.username === "demo") {
          const user = db.prepare("SELECT id, name, email, password FROM users WHERE id = ?").get('1') as { id: string, name: string, email: string, password?: string };
          
          if (user && user.password) {
            const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
            if (isPasswordValid) {
              return { id: user.id, name: user.name, email: user.email };
            }
          }
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
      }
      
      // Fetch latest user data from DB to keep session updated
      if (token.sub) {
        const dbUser = db.prepare("SELECT name, email FROM users WHERE id = ?").get(token.sub) as { name: string, email: string };
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
        }
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      if (trigger === "update" && session?.email) {
        token.email = session.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "moodtrackersecret123",
};
