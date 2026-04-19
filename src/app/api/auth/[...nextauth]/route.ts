import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { supabase } from '@/app/lib/database';
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const allowedDomain = "iacademy.edu.ph";
const validRoles = ["member", "adviser", "osas", "org"];

const handler = NextAuth({
  providers: [
    // Google OAuth provider
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    // Username/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password required");
        }

        // Find user by username
        const { data: user, error } = await supabase
          .from("users")
          .select("id, Email, Username, PasswordHash, Name, Role")
          .eq("Username", credentials.username)
          .maybeSingle();

        if (error || !user) throw new Error("Invalid username or password");

        // Compare the provided password against the stored hash
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.PasswordHash || ""
        );

        if (!isValidPassword) throw new Error("Invalid username or password");

        return {
          id: user.id,
          email: user.Email,
          name: user.Name,
          username: user.Username,
          role: user.Role,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    /**
     * Runs on every sign-in attempt.
     * - Blocks users outside the allowed domain
     * - Auto-creates a new user record on first Google login
     * - Assigns "org" role if email matches an org record, otherwise "member"
     */
    async signIn({ user }) {
      const email = user?.email || "";
      const domain = email.split("@")[1];

      if (domain !== allowedDomain) return "/login?error=unauthorized";

      // Check if user already exists in the database
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, Username")
        .eq("Email", email)
        .maybeSingle();

      // If account is fully set up, allow login
      if (existingUser?.Username) return true;

      // First-time login — insert new user record
        if (!existingUser) {
          // Check all orgs and find one where email matches
          const { data: orgs } = await supabase
            .from("orgs")
            .select("email, adviseremail");

          const matchedOrg = orgs?.find((org) => org.email === email);
          const matchedAdviser = orgs?.find((org) => org.adviseremail === email);

            const role = matchedOrg ? "org" : matchedAdviser ? "adviser" : "member";

            const { error } = await supabase.from("users").insert({
              Email: email,
              Name: user.name,
              Role: role,
            });
          
          if (error) {
            console.error("❌ Supabase insert failed:", error);
            return "/login?error=unauthorized";
          }
        }
      return true;
    },

    /**
     * Controls where the user is redirected after sign-in.
     * Allows internal redirects, defaults to /dashboard.
     */
    async redirect({ url, baseUrl }) {
      try {
        const dest = new URL(url, baseUrl);
        const base = new URL(baseUrl);
        if (dest.origin === base.origin) return dest.toString();
      } catch (e) {
        // fallthrough to default
      }
      return "/dashboard";
    },

    /**
     * Attaches the user's role to the JWT token.
     * For Google logins, fetches role from the database.
     * For credentials logins, role is already on the user object.
     * Always checks if email exists in orgs table and assigns "org" role if found.
     */
    async jwt({ token, user }) {
      const email = user?.email || token?.email as string;
      
      if (email) {
        // First, check if email exists in orgs table
        const { data: orgData } = await supabase
          .from("orgs")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        // If email found in orgs table, set role to "org"
        if (orgData) {
          token.role = "org";
          return token;
        }

        // Check if email is an adviser
        const { data: adviserData } = await supabase
          .from("orgs")
          .select("id")
          .eq("adviseremail", email)
          .maybeSingle();

        if (adviserData) {
          token.role = "adviser";
          return token;
        }

        // Otherwise, fetch role from users table
        const { data, error } = await supabase
          .from("users")
          .select("Role")
          .eq("Email", email)
          .single();

        const role = error ? "member" : data.Role;
        token.role = validRoles.includes(String(role)) ? role : "member";
      } else if ((user as any)?.role) {
        token.role = (user as any).role;
      }

      return token;
    },

    /**
     * Exposes the role from the JWT token to the client-side session object.
     */
    async session({ session, token }) {
      session.user = session.user ?? {
        name: token.name ?? null,
        email: token.email ?? null,
        image: token.picture ?? null,
      };
      (session.user as any).role = token.role ?? "member";
      return session;
    },
  },
});

export { handler as GET, handler as POST };