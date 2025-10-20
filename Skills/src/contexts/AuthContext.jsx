import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("user"); // Default role

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    // Set a maximum loading time of 10 seconds
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 10000);

    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return; // Component unmounted

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setRole("user");
        }

        if (isMounted) {
          setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return; // Component unmounted

      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole("user");
      }

      if (isMounted) {
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const fetchProfile = async (userId) => {
    try {
      // Add a timeout to the profile fetch
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
      );

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) {
        throw error;
      }

      setProfile(data);
      setRole(data?.role || "user"); // Set user role
      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);

      // Set a default profile to allow the app to continue
      const defaultProfile = {
        id: userId,
        email: null,
        full_name: "User",
        role: "user",
        current_level: 1,
        total_xp: 0,
        current_streak: 0,
        longest_streak: 0,
      };

      setProfile(defaultProfile);
      setRole("user");
      return defaultProfile;
    }
  };

  // Helper functions to check roles
  const isAdmin = () => role === "admin";
  const isTrainer = () => role === "trainer" || role === "admin";
  const isUser = () => role === "user";

  // Auth functions
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    profile,
    loading,
    role,
    isAdmin,
    isTrainer,
    isUser,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
