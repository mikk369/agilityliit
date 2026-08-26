import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    /** When this token was issued, in ms — compared against `passwordChangedAt`. */
    issuedAt: number;
    /** Set when the account is gone or the password changed after `issuedAt`. */
    revoked?: boolean;
  }
}
