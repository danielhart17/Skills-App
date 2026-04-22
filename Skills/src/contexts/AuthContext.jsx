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
  const [profileLoaded, setProfileLoaded] = useState(false); // Track if profile was successfully fetched

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

      // Only fetch profile on meaningful auth changes, not token refreshes
      const meaningfulEvents = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'];
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setRole("user");
      } else if (meaningfulEvents.includes(event)) {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      }
      // Ignore TOKEN_REFRESHED and other events - no need to refetch profile

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

  const fetchProfile = async (userId, forceRefresh = false) => {
    // Don't refetch if we already have a valid profile (unless forced)
    if (profile && profile.id === userId && !forceRefresh) {
      return profile;
    }

    try {
      // Add a timeout to the profile fetch (increased to 15 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 15000)
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

      // Ensure entry_exam_completed has a default value
      const profileData = {
        ...data,
        entry_exam_completed: data.entry_exam_completed ?? false,
      };

      setProfile(profileData);
      setRole(profileData?.role || "user");
      setProfileLoaded(true); // Mark as successfully loaded
      return profileData;
    } catch (error) {
      console.error("Error fetching profile:", error);

      // On error, DON'T overwrite existing profile - just log the error
      // Only set default if we have no profile at all
      if (!profile) {
        const defaultProfile = {
          id: userId,
          email: null,
          full_name: "User",
          role: "admin", // Default to admin to prevent showing entry exam on error
          current_level: 1,
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
          entry_exam_completed: true, // Don't show exam on error
        };
        setProfile(defaultProfile);
        setRole("admin");
      }
      // Keep profileLoaded as false on error so we know fetch failed
      return profile;
    }
  };

  // Helper functions to check roles
  const isAdmin = () => role === "admin";
  const isTrainer = () => role === "trainer" || role === "admin";
  const isUser = () => role === "user" || role === "athlete";
  const isParent = () => role === "parent";
  const isAthlete = () => role === "user" || role === "athlete";

  // Auth functions
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName, selectedRole = "athlete") => {
    // Map frontend role selection to database role
    const dbRole = selectedRole === "parent" ? "parent" : "athlete";
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: dbRole,
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

  // Refresh profile data (useful after completing entry exam, etc.)
  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id, true);
    }
    return null;
  };

  const value = {
    user,
    profile,
    loading,
    role,
    profileLoaded,
    isAdmin,
    isTrainer,
    isUser,
    isParent,
    isAthlete,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
