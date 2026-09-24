import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // check existing session
    requireSupabase().auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // listen for auth changes
    const {
      data: { subscription },
    } = requireSupabase().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await requireSupabase().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await requireSupabase().auth.signOut();
  };

  return { user, loading, signIn, signUp, signOut };
}
