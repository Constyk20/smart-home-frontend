import { useEffect, useState } from "react";
import { api } from "../api";

type UserInfo = { full_name?: string | null; email?: string | null };

/**
 * The signed-in user's name for the header greeting. Uses GET /auth/me if the API has it;
 * if not (or it fails) the header just says "Welcome back" without inventing a name.
 */
export function useCurrentUser(): { name: string } | null {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<UserInfo>("/auth/me")
      .then((response) => {
        const name = response.data.full_name?.trim() || response.data.email?.split("@")[0] || "";
        if (!cancelled && name) setUser({ name });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
