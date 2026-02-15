import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_BASE_URL = process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "demo" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Hardcoded demo user check for this local app
        if (credentials?.username === "demo" && credentials?.password === "demo") {
          try {
            // Fetch user data from the backend API instead of direct DB access
            const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
              const user = await res.json();
              return { id: user.id, name: user.name, email: user.email };
            }
          } catch (e) {
            console.error("Auth API Error (authorize):", e);
          }
          // Fallback if backend is unreachable during build or first login
          return { id: "1", name: "Demo User", email: "demo@example.com" };
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
      
      // Fetch latest user data from Backend to keep session updated
      if (token.sub) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.ok) {
            const dbUser = await res.json();
            token.name = dbUser.name;
            token.email = dbUser.email;
          }
        } catch (e) {
          console.error("Auth API Error (jwt):", e);
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
