import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          login: profile.login,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (profile && "login" in profile) {
        const githubUser = (profile as { login: string }).login;
        await prisma.user.upsert({
          where: { githubUser },
          update: {
            name: user.name ?? undefined,
          },
          create: {
            githubUser,
            name: user.name ?? githubUser,
          },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.githubUser) {
        (session.user as any).githubUser = token.githubUser;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile && "login" in profile) {
        token.githubUser = (profile as { login: string }).login;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
