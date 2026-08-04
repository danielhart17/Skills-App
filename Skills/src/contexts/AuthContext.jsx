import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import {
  buildMetadataProfile,
  readLocalUser,
} from "@/utils/localAuthSession";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const initialUser = readLocalUser();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(() =>
    initialUser
      ? buildMetadataProfile(initialUser, initialUser.id).role
      : "user"
  );
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const finishLoading = () => {
      if (isMounted) {
        setLoading(false);
      }
    };

    const bootstrapProfile = async (authUser) => {
      if (!authUser?.id) {
        finishLoading();
        return;
      }

      setUser(authUser);
      await fetchProfile(authUser.id, authUser);
      finishLoading();
    };

    const localUser = readLocalUser();
    if (localUser) {
      bootstrapProfile(localUser);
    } else {
      finishLoading();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const meaningfulEvents = ["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "INITIAL_SESSION"];

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setRole("user");
        setProfileLoaded(false);
      } else if (meaningfulEvents.includes(event)) {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          await fetchProfile(nextUser.id, nextUser);
        } else {
          setProfile(null);
          setRole("user");
          setProfileLoaded(false);
        }
      }

      finishLoading();
    });

    const loadingTimeoutId = window.setTimeout(finishLoading, 3000);

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId, authUser = user, forceRefresh = false) => {
    if (profile && profile.id === userId && !forceRefresh) {
      return profile;
    }

    const applyProfile = (profileData, loaded = true) => {
      setProfile(profileData);
      setRole(profileData?.role || "user");
      setProfileLoaded(loaded);
      return profileData;
    };

    try {
      const timeoutPromise = new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
      );

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        if (error.code !== "PGRST116") {
          throw error;
        }

        let createdProfile = null;
        let createError = null;

        const repairResult = await supabase.rpc("ensure_current_user_profile");

        if (
          repairResult.error &&
          !repairResult.error.message?.includes("Could not find the function")
        ) {
          createError = repairResult.error;
        } else if (repairResult.data) {
          createdProfile = repairResult.data;
        } else {
          const profileFromMetadata = buildMetadataProfile(authUser, userId);
          const upsertResult = await supabase
            .from("profiles")
            .upsert(profileFromMetadata, { onConflict: "id" })
            .select("*")
            .single();

          createdProfile = upsertResult.data;
          createError = upsertResult.error;
        }

        if (createError) {
          throw createError;
        }

        return applyProfile({
          ...createdProfile,
          entry_exam_completed: createdProfile.entry_exam_completed ?? false,
        });
      }

      return applyProfile({
        ...data,
        entry_exam_completed: data.entry_exam_completed ?? false,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);

      if (!profile) {
        return applyProfile(buildMetadataProfile(authUser, userId), false);
      }

      return profile;
    }
  };

  const isAdmin = () => role === "admin";
  const isTrainer = () => role === "trainer" || role === "admin";
  const isUser = () => role === "user" || role === "athlete";
  const isParent = () => role === "parent";
  const isAthlete = () => role === "user" || role === "athlete";

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName, selectedRole = "athlete") => {
    const allowedSignupRoles = ["athlete", "parent", "trainer"];
    const dbRole = allowedSignupRoles.includes(selectedRole)
      ? selectedRole
      : "athlete";

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

  const clearAuthState = () => {
    setUser(null);
    setProfile(null);
    setRole("user");
    setProfileLoaded(false);
  };

  const signOut = async () => {
    clearAuthState();

    try {
      const remoteSignOut = supabase.auth.signOut();
      const timeout = new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Sign out timed out")),
          5000
        );
      });

      await Promise.race([remoteSignOut, timeout]);
    } catch (error) {
      console.warn("Remote sign out failed, clearing local session:", error);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localError) {
        console.error("Local sign out failed:", localError);
      }
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id, user, true);
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
