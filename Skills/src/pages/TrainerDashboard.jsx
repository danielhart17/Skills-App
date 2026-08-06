import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/api/supabaseClient";
import { createConnectAccount, getTrainerStripeStatus } from "@/api/stripeService";
import { fetchTrainerActiveConnections } from "@/api/messagingService";
import { notifyFollowersOfWorkout } from "@/api/followService";
import {
  Trophy,
  Calendar,
  CalendarDays,
  User,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  Star,
  Clock,
  CalendarX,
  Award,
  CalendarPlus,
  MapPin,
  Users,
  Image,
  Video,
  Images,
  Play,
  X,
  Upload,
  CreditCard,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MessageCircle,
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import {
  SKILL_LEVEL_OPTIONS,
  skillLevelLabel,
  normalizeRecurrenceDays,
} from "@/lib/sessionBooking";
import TrainerScheduleTab from "@/components/trainers/TrainerScheduleTab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_DASHBOARD_STATS = {
  athletesRegistered: 0,
  sessionsCompleted: 0,
  upcomingBookings: 0,
  avgRating: null,
  reviewCount: 0,
  workoutsCreated: 0,
  activeSessions: 0,
  upcomingEvents: 0,
};

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function TrainerDashboard() {
  const { isTrainer, profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [_loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(EMPTY_DASHBOARD_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  // Redirect if not trainer or admin
  useEffect(() => {
    if (!isTrainer()) {
      navigate("/home");
    }
  }, [isTrainer, navigate]);

  // Handle Stripe onboarding return
  useEffect(() => {
    const stripeOnboarding = searchParams.get("stripe_onboarding");
    const stripeRefresh = searchParams.get("stripe_refresh");
    
    if (stripeOnboarding === "complete") {
      toast.success("Stripe setup completed! Refreshing status...");
      setActiveTab("profile");
      // Clear the URL params
      setSearchParams({});
      // Refresh trainer profile to get updated Stripe status
      loadData();
    } else if (stripeRefresh === "true") {
      toast.info("Please complete your Stripe onboarding to receive payments.");
      setActiveTab("profile");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Load Stripe status when trainer profile changes
  useEffect(() => {
    if (trainerProfile?.id) {
      loadStripeStatus();
    }
  }, [trainerProfile?.id]);

  const loadStripeStatus = async () => {
    if (!trainerProfile?.id) return;
    try {
      const status = await getTrainerStripeStatus(trainerProfile.id);
      setStripeStatus(status);
    } catch (error) {
      console.error("Error loading Stripe status:", error);
    }
  };

  const loadDashboardOverview = useCallback(async () => {
    if (!profile?.id) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      const { data: trainerData, error: trainerError } = await supabase
        .from("trainers")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (trainerError && trainerError.code !== "PGRST116") {
        throw trainerError;
      }

      if (trainerData) {
        setTrainerProfile(trainerData);
      }

      const trainerId = trainerData?.id;
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);

      const [
        challengesResult,
        sessionsResult,
        bookingsResult,
        reviewsResult,
        eventsResult,
        connections,
      ] = await Promise.all([
        supabase
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("created_by", profile.id),
        trainerId
          ? supabase
              .from("trainer_services")
              .select("id", { count: "exact", head: true })
              .eq("trainer_id", trainerId)
          : Promise.resolve({ count: 0, error: null }),
        trainerId
          ? supabase
              .from("bookings")
              .select("id, status, booking_datetime")
              .eq("trainer_id", trainerId)
          : Promise.resolve({ data: [], error: null }),
        trainerId
          ? supabase
              .from("reviews")
              .select("rating")
              .eq("trainer_id", trainerId)
          : Promise.resolve({ data: [], error: null }),
        trainerId
          ? supabase
              .from("training_events")
              .select("id, date")
              .eq("trainer_id", trainerId)
              .gte("date", today)
          : Promise.resolve({ data: [], error: null }),
        user?.id
          ? fetchTrainerActiveConnections(user.id).catch(() => [])
          : Promise.resolve([]),
      ]);

      const bookingRows = bookingsResult.data || [];
      const completedStatuses = new Set(["completed", "complete"]);
      const cancelledStatuses = new Set(["cancelled", "canceled"]);
      const sessionsCompleted = bookingRows.filter((b) =>
        completedStatuses.has(String(b.status || "").toLowerCase())
      ).length;
      const upcomingBookings = bookingRows.filter((b) => {
        const status = String(b.status || "").toLowerCase();
        if (cancelledStatuses.has(status) || completedStatuses.has(status)) {
          return false;
        }
        if (!b.booking_datetime) return true;
        return new Date(b.booking_datetime) >= new Date(nowIso);
      }).length;

      const reviewRows = reviewsResult.data || [];
      const avgRating =
        reviewRows.length > 0
          ? reviewRows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            reviewRows.length
          : null;

      setDashboardStats({
        athletesRegistered: connections?.length || 0,
        sessionsCompleted,
        upcomingBookings,
        avgRating,
        reviewCount: reviewRows.length,
        workoutsCreated: challengesResult.count || 0,
        activeSessions: sessionsResult.count || 0,
        upcomingEvents: (eventsResult.data || []).length,
      });
    } catch (error) {
      console.error("Error loading trainer dashboard overview:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [profile?.id, user?.id]);

  const loadData = useCallback(async () => {
    if (!profile) return; // Safety check

    setLoading(true);
    try {
      if (activeTab === "challenges") {
        const { data, error } = await supabase
          .from("challenges")
          .select("*")
          .eq("created_by", profile.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setChallenges(data || []);
      } else if (activeTab === "sessions") {
        const { data: trainerData, error: trainerError } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerError && trainerError.code !== "PGRST116") {
          console.error("Error fetching trainer profile:", trainerError);
          throw trainerError;
        }

        if (trainerData) {
          setTrainerProfile(trainerData);

          const [sessionsResult, bookingsResult] = await Promise.all([
            supabase
              .from("trainer_services")
              .select("*")
              .eq("trainer_id", trainerData.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("bookings")
              .select("*, profiles:user_id(full_name, email)")
              .eq("trainer_id", trainerData.id)
              .order("booking_datetime", { ascending: true }),
          ]);

          if (sessionsResult.error) throw sessionsResult.error;
          if (bookingsResult.error) throw bookingsResult.error;

          setTrainingSessions(sessionsResult.data || []);
          setBookings(bookingsResult.data || []);
        } else {
          setTrainerProfile(null);
          setTrainingSessions([]);
          setBookings([]);
          setSelectedSession(null);
        }
      } else if (activeTab === "reviews") {
        // Get trainer profile first
        const { data: trainerData, error: trainerError } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerError && trainerError.code !== "PGRST116") {
          console.error("Error fetching trainer profile:", trainerError);
          throw trainerError;
        }

        if (trainerData) {
          const { data, error } = await supabase
            .from("reviews")
            .select("*, profiles:user_id(full_name, email)")
            .eq("trainer_id", trainerData.id)
            .order("created_at", { ascending: false });
          if (error) {
            console.error("Error fetching reviews:", error);
            throw error;
          }
          setReviews(data || []);
        } else {
          // No trainer profile found
          setReviews([]);
        }
      } else if (activeTab === "events") {
        // Get trainer profile first
        const { data: trainerData, error: trainerError } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerError && trainerError.code !== "PGRST116") {
          console.error("Error fetching trainer profile:", trainerError);
          throw trainerError;
        }

        if (trainerData) {
          setTrainerProfile(trainerData);
          const { data, error } = await supabase
            .from("training_events")
            .select("*")
            .eq("trainer_id", trainerData.id)
            .order("date", { ascending: true });
          if (error) {
            console.error("Error fetching events:", error);
            throw error;
          }
          setEvents(data || []);
        } else {
          setEvents([]);
        }
      } else if (activeTab === "gallery") {
        const { data, error } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching trainer profile:", error);
          throw error;
        }
        setTrainerProfile(data);
      } else if (activeTab === "profile") {
        const { data, error } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching trainer profile:", error);
          throw error;
        }
        setTrainerProfile(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      loadDashboardOverview();
    }
  }, [profile, activeTab, loadDashboardOverview]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [loadData, profile]);

  const quickActions = useMemo(
    () => [
      {
        key: "challenges",
        label: "Workouts",
        description: "Build & assign",
        icon: Trophy,
        count: dashboardStats.workoutsCreated,
        countLabel: "created",
        tone: "from-orange-500 to-red-500",
        iconBg: "bg-orange-500/20 text-orange-300",
      },
      {
        key: "schedule",
        label: "Schedule",
        description: "Upcoming bookings",
        icon: CalendarDays,
        count: dashboardStats.upcomingBookings,
        countLabel: "soon",
        tone: "from-violet-500 to-purple-600",
        iconBg: "bg-violet-500/20 text-violet-300",
      },
      {
        key: "sessions",
        label: "Sessions",
        description: "Bookable training",
        icon: Calendar,
        count: dashboardStats.activeSessions,
        countLabel: "live",
        tone: "from-blue-500 to-indigo-500",
        iconBg: "bg-blue-500/20 text-blue-300",
      },
      {
        key: "events",
        label: "Events",
        description: "Clinics & camps",
        icon: CalendarPlus,
        count: dashboardStats.upcomingEvents,
        countLabel: "upcoming",
        tone: "from-emerald-500 to-teal-500",
        iconBg: "bg-emerald-500/20 text-emerald-300",
      },
      {
        key: "reviews",
        label: "Reviews",
        description: "Athlete feedback",
        icon: Star,
        count: dashboardStats.reviewCount,
        countLabel: "total",
        tone: "from-yellow-500 to-amber-500",
        iconBg: "bg-yellow-500/20 text-yellow-300",
      },
      {
        key: "gallery",
        label: "Gallery",
        description: "Photos & clips",
        icon: Images,
        count: trainerProfile?.gallery?.length || 0,
        countLabel: "items",
        tone: "from-sky-500 to-cyan-600",
        iconBg: "bg-sky-500/20 text-sky-300",
      },
      {
        key: "profile",
        label: "Profile",
        description: "Bio & payments",
        icon: User,
        count: stripeStatus?.charges_enabled ? "Ready" : "Setup",
        countLabel: "Stripe",
        tone: "from-slate-500 to-slate-700",
        iconBg: "bg-slate-500/20 text-slate-300",
      },
    ],
    [dashboardStats, trainerProfile?.gallery?.length, stripeStatus?.charges_enabled]
  );

  const handleDeleteChallenge = async (id) => {
    if (!confirm("Are you sure you want to delete this workout?")) return;

    try {
      const { error } = await supabase.from("challenges").delete().eq("id", id);

      if (error) throw error;
      toast.success("Workout deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Failed to delete workout");
    }
  };

  const handleSaveChallenge = async (data, isEdit = false) => {
    try {
      const saveData = {
        ...data,
        created_by: profile.id,
        trainer_id: trainerProfile?.id || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("challenges")
          .update(saveData)
          .eq("id", data.id);
        if (error) throw error;
        toast.success("Workout updated successfully");
      } else {
        const { data: created, error } = await supabase
          .from("challenges")
          .insert([saveData])
          .select()
          .single();
        if (error) throw error;

        const notified = await notifyFollowersOfWorkout({
          workoutTitle: created?.title || saveData.title,
          workoutId: created?.id || null,
        });

        if (notified > 0) {
          toast.success(
            `Workout created — ${notified} follower${notified === 1 ? "" : "s"} notified`
          );
        } else {
          toast.success("Workout created successfully");
        }
      }

      loadData();
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    }
  };

  const handleSaveProfile = async (data) => {
    try {
      let savedProfile = null;

      if (trainerProfile) {
        const { data: updatedTrainer, error } = await supabase
          .from("trainers")
          .update(data)
          .eq("id", trainerProfile.id)
          .select()
          .single();
        if (error) throw error;
        savedProfile = updatedTrainer;
      } else {
        const { data: newTrainer, error } = await supabase
          .from("trainers")
          .insert([{ ...data, user_id: profile.id }])
          .select()
          .single();
        if (error) throw error;
        savedProfile = newTrainer;

        if (newTrainer?.id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ trainer_id: newTrainer.id })
            .eq("id", profile.id);
          if (profileError) {
            console.warn("Trainer profile created, but profile link failed:", profileError);
          }
        }
      }

      setTrainerProfile(savedProfile);
      toast.success(trainerProfile ? "Profile updated successfully" : "Trainer profile created successfully");
      await loadData();
      return savedProfile;
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
      throw error;
    }
  };

  const handleSaveEvent = async (data, isEdit = false) => {
    try {
      let activeTrainerProfile = trainerProfile;
      if (!activeTrainerProfile) {
        const { data: trainerData, error: trainerError } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerError && trainerError.code !== "PGRST116") {
          throw trainerError;
        }

        activeTrainerProfile = trainerData;
        setTrainerProfile(trainerData);
      }

      if (!activeTrainerProfile?.id) {
        throw new Error("Create your trainer profile before creating events.");
      }

      const saveData = {
        title: data.title,
        date: data.date,
        location: data.location || null,
        price: data.price ?? 0,
        spots_available: data.max_participants ?? data.spots_available ?? 20,
        trainer_id: activeTrainerProfile.id,
        created_by: profile.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("training_events")
          .update(saveData)
          .eq("id", data.id);
        if (error) throw error;
        toast.success("Event updated successfully");
      } else {
        const { error } = await supabase
          .from("training_events")
          .insert([saveData]);
        if (error) throw error;
        toast.success("Event created successfully");
      }

      await loadData();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error(error.message || "Failed to save event");
      throw error;
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase.from("training_events").delete().eq("id", id);

      if (error) throw error;
      toast.success("Event deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const getSessionBookings = (session) => {
    if (!session) return [];
    return bookings.filter(
      (booking) =>
        booking.service_id === session.id ||
        (!booking.service_id &&
          booking.service_name &&
          booking.service_name === session.name)
    );
  };

  const ensureTrainerProfile = async () => {
    if (trainerProfile?.id) return trainerProfile;

    if (!profile?.id) {
      throw new Error("Please sign in again, then try creating a session.");
    }

    const { data, error } = await supabase
      .from("trainers")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      setActiveTab("profile");
      throw new Error(
        "Create your trainer profile before adding training sessions."
      );
    }

    setTrainerProfile(data);
    return data;
  };

  const handleSaveTrainingSession = async (data, isEdit = false) => {
    const recurrenceDays = Array.isArray(data.recurrence_days)
      ? data.recurrence_days
      : [];
    const payload = {
      p_name: data.name.trim(),
      p_description: data.description?.trim() || null,
      p_price: Number(data.price) || 0,
      p_duration_minutes: Number(data.duration_minutes) || 60,
      p_session_date: data.is_recurring ? null : data.session_date || null,
      p_start_time: data.start_time || null,
      p_location: data.location?.trim() || null,
      p_skill_level: data.skill_level || "all_levels",
      p_is_recurring: Boolean(data.is_recurring),
      p_recurrence_days: data.is_recurring ? recurrenceDays : [],
    };

    try {
      let savedRow = null;

      if (isEdit) {
        const { data: updated, error } = await supabase.rpc(
          "update_trainer_service",
          { p_id: data.id, ...payload }
        );

        if (error) {
          // Fallback to direct update if RPC not deployed yet
          const activeTrainer = await ensureTrainerProfile();
          const saveData = {
            name: payload.p_name,
            description: payload.p_description,
            price: payload.p_price,
            duration_minutes: payload.p_duration_minutes,
            trainer_id: activeTrainer.id,
            session_date: payload.p_session_date,
            start_time: payload.p_start_time,
            location: payload.p_location,
            skill_level: payload.p_skill_level,
            is_recurring: payload.p_is_recurring,
            recurrence_days: payload.p_recurrence_days,
          };
          const { data: directUpdated, error: directError } = await supabase
            .from("trainer_services")
            .update(saveData)
            .eq("id", data.id)
            .select()
            .single();
          if (directError) throw directError;
          savedRow = directUpdated;
        } else {
          savedRow = updated;
        }

        toast.success("Training session updated");
        if (selectedSession?.id === data.id && savedRow) {
          setSelectedSession(savedRow);
        }
      } else {
        const { data: created, error } = await supabase.rpc(
          "create_trainer_service",
          payload
        );

        if (error) {
          // Fallback to direct insert if RPC not deployed yet
          const activeTrainer = await ensureTrainerProfile();
          const saveData = {
            name: payload.p_name,
            description: payload.p_description,
            price: payload.p_price,
            duration_minutes: payload.p_duration_minutes,
            trainer_id: activeTrainer.id,
            session_date: payload.p_session_date,
            start_time: payload.p_start_time,
            location: payload.p_location,
            skill_level: payload.p_skill_level,
            is_recurring: payload.p_is_recurring,
            recurrence_days: payload.p_recurrence_days,
          };

          let { data: directCreated, error: directError } = await supabase
            .from("trainer_services")
            .insert([saveData])
            .select()
            .single();

          if (
            directError &&
            (directError.message?.includes("skill_level") ||
              directError.message?.includes("is_recurring") ||
              directError.message?.includes("recurrence_days") ||
              directError.message?.includes("session_date") ||
              directError.message?.includes("start_time") ||
              directError.message?.includes("location") ||
              directError.code === "PGRST204")
          ) {
            const {
              session_date,
              start_time,
              location,
              skill_level,
              is_recurring,
              recurrence_days,
              ...legacyData
            } = saveData;
            ({ data: directCreated, error: directError } = await supabase
              .from("trainer_services")
              .insert([
                {
                  ...legacyData,
                  ...(session_date !== undefined ? { session_date } : {}),
                  ...(start_time !== undefined ? { start_time } : {}),
                  ...(location !== undefined ? { location } : {}),
                },
              ])
              .select()
              .single());
          }

          if (directError) {
            if (
              directError.code === "42501" ||
              directError.message?.toLowerCase().includes("row-level security")
            ) {
              throw new Error(
                "Permission denied. Run create_trainer_service_rpc.sql in Supabase SQL Editor, then try again."
              );
            }
            throw directError;
          }
          savedRow = directCreated;
        } else {
          savedRow = created;
        }

        toast.success("Training session created");
        if (savedRow) {
          setTrainingSessions((prev) => [savedRow, ...prev]);
        }
      }

      await loadData();
      return savedRow;
    } catch (error) {
      console.error("Error saving training session:", error);
      toast.error(error.message || "Failed to save training session");
      throw error;
    }
  };

  const handleDeleteTrainingSession = async (id) => {
    if (
      !confirm(
        "Delete this training session? Existing bookings stay, but athletes can no longer book this offering."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("trainer_services")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Training session deleted");
      if (selectedSession?.id === id) setSelectedSession(null);
      loadData();
    } catch (error) {
      console.error("Error deleting training session:", error);
      toast.error(error.message || "Failed to delete training session");
    }
  };

  const handleAddGalleryItem = async (item) => {
    try {
      const currentGallery = trainerProfile?.gallery || [];
      const newGallery = [...currentGallery, { ...item, created_at: new Date().toISOString() }];
      
      const { error } = await supabase
        .from("trainers")
        .update({ gallery: newGallery })
        .eq("id", trainerProfile.id);

      if (error) throw error;
      toast.success("Media added to gallery");
      loadData();
    } catch (error) {
      console.error("Error adding to gallery:", error);
      toast.error("Failed to add media");
    }
  };

  const handleDeleteGalleryItem = async (index) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const currentGallery = trainerProfile?.gallery || [];
      const newGallery = currentGallery.filter((_, i) => i !== index);
      
      const { error } = await supabase
        .from("trainers")
        .update({ gallery: newGallery })
        .eq("id", trainerProfile.id);

      if (error) throw error;
      toast.success("Item removed from gallery");
      loadData();
    } catch (error) {
      console.error("Error removing from gallery:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleUpdateGalleryCaption = async (index, caption) => {
    try {
      const currentGallery = [...(trainerProfile?.gallery || [])];
      currentGallery[index] = { ...currentGallery[index], caption };
      
      const { error } = await supabase
        .from("trainers")
        .update({ gallery: currentGallery })
        .eq("id", trainerProfile.id);

      if (error) throw error;
      toast.success("Caption updated");
      loadData();
    } catch (error) {
      console.error("Error updating caption:", error);
      toast.error("Failed to update caption");
    }
  };

  if (!isTrainer()) return null;

  if (!profile) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🏀</div>
            <p className="text-gray-600">Loading trainer profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Coach";

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-brand-orange" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Welcome back, {firstName}!
            </h1>
          </div>
          <p className="text-brand-lightGray text-lg">
            Manage your roster, sessions, and training content
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/trainer/athletes">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 h-auto rounded-xl shadow-lg">
              <Users className="w-5 h-5 mr-2" />
              Athletes
            </Button>
          </Link>
          <Link to="/trainer/messages">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 h-auto rounded-xl shadow-lg">
              <MessageCircle className="w-5 h-5 mr-2" />
              Messages
            </Button>
          </Link>
        </div>
      </div>

      {!statsLoading && dashboardStats.activeSessions === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="font-medium text-amber-100">
                Publish at least one training session
              </p>
              <p className="text-sm text-amber-200/80">
                Athletes book your session offerings (including recurring weekly
                times) — not a separate availability calendar.
              </p>
            </div>
            <Button
              className="bg-brand-orange hover:opacity-90 shrink-0"
              onClick={() => setActiveTab(trainerProfile ? "sessions" : "profile")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {trainerProfile ? "Add Session" : "Finish Setup"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Athletes Registered</p>
                <p className="text-3xl font-bold mt-1">
                  {statsLoading ? "—" : dashboardStats.athletesRegistered}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
            <p className="text-blue-100 text-xs mt-3">Active connections on your roster</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Sessions Completed</p>
                <p className="text-3xl font-bold mt-1">
                  {statsLoading ? "—" : dashboardStats.sessionsCompleted}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-200" />
            </div>
            <p className="text-emerald-100 text-xs mt-3">Finished bookings lifetime</p>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => {
            setSelectedSession(null);
            setActiveTab("schedule");
          }}
          className="text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl h-full hover:opacity-95 transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Upcoming Bookings</p>
                  <p className="text-3xl font-bold mt-1">
                    {statsLoading ? "—" : dashboardStats.upcomingBookings}
                  </p>
                </div>
                <CalendarDays className="w-8 h-8 text-orange-200" />
              </div>
              <p className="text-orange-100 text-xs mt-3">Tap to open schedule</p>
            </CardContent>
          </Card>
        </button>

        <Card className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Average Rating</p>
                <p className="text-3xl font-bold mt-1">
                  {statsLoading
                    ? "—"
                    : dashboardStats.avgRating != null
                      ? dashboardStats.avgRating.toFixed(1)
                      : "—"}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-100" />
            </div>
            <p className="text-yellow-100 text-xs mt-3">
              {dashboardStats.reviewCount > 0
                ? `From ${dashboardStats.reviewCount} review${dashboardStats.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 sm:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isActive = activeTab === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setActiveTab(action.key);
                }}
                className={`group relative aspect-square rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 shadow-lg hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                  isActive
                    ? "border-brand-orange bg-gradient-to-br from-gray-800 to-gray-900 ring-1 ring-brand-orange/60"
                    : "border-gray-700/80 bg-card hover:border-gray-500"
                }`}
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${action.iconBg}`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="text-white font-semibold text-base sm:text-lg leading-tight">
                  {action.label}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 line-clamp-2">
                  {action.description}
                </p>
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r ${action.tone}`}
                  >
                    {statsLoading && typeof action.count === "number" ? "—" : action.count}
                    {typeof action.count === "number" ? (
                      <span className="ml-1 font-normal opacity-90 hidden sm:inline">
                        {action.countLabel}
                      </span>
                    ) : null}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setSelectedSession(null);
          setActiveTab(value);
        }}
        className="space-y-6"
      >
        <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 pb-1">
        <TabsList className="inline-flex w-max min-w-full gap-1 sm:grid sm:w-full sm:grid-cols-7 bg-card p-1 rounded-xl border border-border h-auto">
          <TabsTrigger value="challenges" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <Trophy className="w-4 h-4 mr-1.5 sm:mr-2" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="schedule" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <CalendarDays className="w-4 h-4 mr-1.5 sm:mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="events" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <CalendarPlus className="w-4 h-4 mr-1.5 sm:mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="sessions" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <Calendar className="w-4 h-4 mr-1.5 sm:mr-2" />
            Training Sessions
          </TabsTrigger>
          <TabsTrigger value="reviews" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <Star className="w-4 h-4 mr-1.5 sm:mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="gallery" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <Images className="w-4 h-4 mr-1.5 sm:mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="profile" className="shrink-0 px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md">
            <User className="w-4 h-4 mr-1.5 sm:mr-2" />
            Profile
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Schedule Tab — upcoming booked sessions + attendees */}
        <TabsContent value="schedule" className="space-y-4">
          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to view your booking schedule
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TrainerScheduleTab trainerId={trainerProfile.id} />
          )}
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              My Workouts ({challenges.length})
            </h2>
            <ChallengeDialog
              onSave={(data) => handleSaveChallenge(data)}
              trigger={
                <Button className="h-11 px-5 rounded-xl bg-brand-orange hover:opacity-90 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Workout
                </Button>
              }
            />
          </div>

          {challenges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No workouts yet. Create your first workout!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{challenge.title}</CardTitle>
                        <CardDescription>
                          {challenge.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <ChallengeDialog
                          challenge={challenge}
                          onSave={(data) => handleSaveChallenge(data, true)}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteChallenge(challenge.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge>{challenge.category}</Badge>
                      <Badge variant="outline">{challenge.difficulty}</Badge>
                      <Badge variant="secondary">
                        {challenge.duration_minutes} min
                      </Badge>
                      <Badge variant="secondary">
                        {challenge.xp_reward} XP
                      </Badge>
                      {challenge.is_featured && <Badge>Featured</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              My Events ({events.length})
            </h2>
            {trainerProfile && (
              <EventDialog
                onSave={(data) => handleSaveEvent(data)}
                trigger={
                  <Button className="h-11 px-5 rounded-xl bg-brand-orange hover:opacity-90 text-white">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                }
              />
            )}
          </div>

          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to create events
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No events yet. Create your first training event!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription>{event.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <EventDialog
                          event={event}
                          onSave={(data) => handleSaveEvent(data, true)}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {(event.max_participants || event.spots_available) && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {event.current_participants || event.registered_count || 0}/
                              {event.max_participants || event.spots_available}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge>{event.event_type || "Training"}</Badge>
                        {event.price && (
                          <Badge variant="secondary">${event.price}</Badge>
                        )}
                        {event.duration_minutes && (
                          <Badge variant="outline">{event.duration_minutes} min</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Training Sessions Tab (replaces flat Bookings list) */}
        <TabsContent value="sessions" className="space-y-4">
          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to offer training sessions
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : selectedSession ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="px-0 h-auto text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSession(null)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Training Sessions
                  </Button>
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {selectedSession.name}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {selectedSession.description || "No description"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedSession.session_date && (
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatSessionDate(selectedSession.session_date)}
                        </Badge>
                      )}
                      {selectedSession.start_time && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatSessionTime(selectedSession.start_time)}
                        </Badge>
                      )}
                      {selectedSession.location && (
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />
                          {selectedSession.location}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <DollarSign className="w-3 h-3 mr-1" />
                        ${selectedSession.price}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedSession.duration_minutes} min
                      </Badge>
                      <Badge>
                        <Users className="w-3 h-3 mr-1" />
                        {getSessionBookings(selectedSession).length} booked
                      </Badge>
                    </div>
                  </div>
                </div>
                <TrainingSessionDialog
                  session={selectedSession}
                  onSave={(data) => handleSaveTrainingSession(data, true)}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Session
                    </Button>
                  }
                />
              </div>

              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-orange" />
                Who booked this session
              </h3>

              {getSessionBookings(selectedSession).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No one has booked this session yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {getSessionBookings(selectedSession).map((booking) => (
                    <Card key={booking.id}>
                      <CardHeader>
                        <CardTitle>
                          {booking.profiles?.full_name || "Unknown Athlete"}
                        </CardTitle>
                        <CardDescription>
                          {booking.profiles?.email || "No email on file"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {new Date(
                                booking.booking_datetime
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge>{booking.status}</Badge>
                            {booking.payment_status && (
                              <Badge variant="secondary">
                                {booking.payment_status}
                              </Badge>
                            )}
                            {booking.duration_minutes && (
                              <Badge variant="outline">
                                {booking.duration_minutes} min
                              </Badge>
                            )}
                          </div>
                          {(booking.user_notes || booking.notes) && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {booking.user_notes || booking.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Training Sessions ({trainingSessions.length})
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create bookable sessions for athletes, then open one to see
                    who booked.
                  </p>
                </div>
                <TrainingSessionDialog
                  onSave={(data) => handleSaveTrainingSession(data)}
                  trigger={
                    <Button className="h-11 px-5 rounded-xl bg-brand-orange hover:opacity-90 text-white">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Training Session
                    </Button>
                  }
                />
              </div>

              {trainingSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No training sessions yet. Add one so athletes can book
                      with you.
                    </p>
                    <TrainingSessionDialog
                      onSave={(data) => handleSaveTrainingSession(data)}
                      trigger={
                        <Button className="h-11 px-5 rounded-xl bg-brand-orange hover:opacity-90 text-white">
                          <Plus className="w-5 h-5 mr-2" />
                          Add Training Session
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {trainingSessions.map((session) => {
                    const sessionBookings = getSessionBookings(session);
                    return (
                      <Card
                        key={session.id}
                        className="cursor-pointer hover:border-brand-orange/50 transition-colors"
                        onClick={() => setSelectedSession(session)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <CardTitle className="flex items-center gap-2">
                                {session.name}
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              </CardTitle>
                              <CardDescription className="line-clamp-2 mt-1">
                                {session.description || "No description"}
                              </CardDescription>
                            </div>
                            <div
                              className="flex gap-2 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TrainingSessionDialog
                                session={session}
                                onSave={(data) =>
                                  handleSaveTrainingSession(data, true)
                                }
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTrainingSession(session.id)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {skillLevelLabel(session.skill_level)}
                            </Badge>
                            {session.is_recurring ? (
                              <Badge variant="outline">
                                Weekly
                                {normalizeRecurrenceDays(session.recurrence_days)
                                  .length
                                  ? ` · ${normalizeRecurrenceDays(session.recurrence_days)
                                      .map((d) => d.slice(0, 3))
                                      .join(", ")}`
                                  : ""}
                              </Badge>
                            ) : session.session_date ? (
                              <Badge variant="outline">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatSessionDate(session.session_date)}
                              </Badge>
                            ) : null}
                            {session.start_time && (
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatSessionTime(session.start_time)}
                              </Badge>
                            )}
                            {session.location && (
                              <Badge variant="outline">
                                <MapPin className="w-3 h-3 mr-1" />
                                {session.location}
                              </Badge>
                            )}
                            <Badge variant="secondary">
                              <DollarSign className="w-3 h-3 mr-1" />$
                              {session.price}
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {session.duration_minutes} min
                            </Badge>
                            <Badge>
                              <Users className="w-3 h-3 mr-1" />
                              {sessionBookings.length} booked
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <h2 className="text-2xl font-semibold">
            My Reviews ({reviews.length})
          </h2>

          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to receive reviews
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Reviews will appear here once students rate your sessions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Average Rating Summary */}
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Overall Rating</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= (trainerProfile.rating || 0)
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-2xl font-bold">
                          {trainerProfile.rating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="text-muted-foreground">
                          ({reviews.length} review
                          {reviews.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Reviews */}
              <div className="grid gap-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {review.profiles?.full_name || "Anonymous"}
                          </CardTitle>
                          <CardDescription>
                            {review.profiles?.email}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {review.comment && (
                        <p className="text-sm leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline">
                          {new Date(review.created_at).toLocaleDateString()}
                        </Badge>
                        {review.booking_id && (
                          <Badge variant="secondary">From Booking</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              My Gallery ({trainerProfile?.gallery?.length || 0})
            </h2>
          </div>

          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to add gallery items
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Add Media
                  </CardTitle>
                  <CardDescription>
                    Upload photos and videos to showcase your training sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GalleryUploader onAdd={handleAddGalleryItem} />
                </CardContent>
              </Card>

              {/* Gallery Grid */}
              {trainerProfile?.gallery?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trainerProfile.gallery.map((item, index) => (
                    <Card key={index} className="overflow-hidden group relative">
                      <div className="aspect-square relative">
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.caption || "Gallery image"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.caption || "Video thumbnail"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Video className="w-12 h-12 text-gray-400" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Delete button overlay */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteGalleryItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm text-muted-foreground truncate">
                          {item.caption || "No caption"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.created_at && new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Images className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No media in your gallery yet. Add photos and videos above!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <h2 className="text-2xl font-semibold">Trainer Profile</h2>

          {trainerProfile && dashboardStats.activeSessions === 0 && (
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-medium text-amber-100">
                    Add at least one training session
                  </p>
                  <p className="text-sm text-amber-200/80">
                    Athletes can only book the sessions you publish — this
                    replaces a general availability calendar.
                  </p>
                </div>
                <Button
                  className="bg-brand-orange hover:opacity-90"
                  onClick={() => setActiveTab("sessions")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Session
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Stripe Connect Section */}
          {trainerProfile ? (
            <StripeConnectCard 
              trainerProfile={trainerProfile}
              stripeStatus={stripeStatus}
              onRefresh={loadStripeStatus}
              loading={stripeLoading}
              setLoading={setStripeLoading}
            />
          ) : (
            <Card className="border border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg">Payment Setup</CardTitle>
                <CardDescription>
                  Save your trainer profile and first training session, then connect Stripe to receive payments.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          <TrainerProfileForm
            profile={trainerProfile}
            onSave={handleSaveProfile}
            requireFirstSession={!trainerProfile}
            onCreateFirstSession={(sessionData) =>
              handleSaveTrainingSession(sessionData, false)
            }
            onNeedSession={() => setActiveTab("sessions")}
            sessionCount={dashboardStats.activeSessions}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

// Stripe Connect Card Component
function StripeConnectCard({ trainerProfile, stripeStatus, onRefresh, loading, setLoading }) {
  const [stripeError, setStripeError] = useState("");

  const handleSetupStripe = async () => {
    setLoading(true);
    setStripeError("");
    try {
      const { url } = await createConnectAccount(trainerProfile.id);
      // Redirect to Stripe onboarding
      window.location.href = url;
    } catch (error) {
      console.error("Error setting up Stripe:", error);
      const message =
        error.message || "Failed to start Stripe setup. Please try again.";
      setStripeError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  const handleContinueSetup = async () => {
    setLoading(true);
    setStripeError("");
    try {
      const { url } = await createConnectAccount(trainerProfile.id);
      window.location.href = url;
    } catch (error) {
      console.error("Error continuing Stripe setup:", error);
      const message =
        error.message || "Failed to continue Stripe setup. Please try again.";
      setStripeError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  const isFullySetup = stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled;
  const hasStartedSetup = stripeStatus?.hasAccount;
  const needsMoreInfo = hasStartedSetup && !isFullySetup;

  return (
    <Card className={`border-2 ${isFullySetup ? "border-green-500/50 bg-green-950/20" : needsMoreInfo ? "border-yellow-500/50 bg-yellow-950/20" : "border-gray-600"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isFullySetup ? "bg-green-500/20" : needsMoreInfo ? "bg-yellow-500/20" : "bg-gray-500/20"
            }`}>
              <CreditCard className={`w-5 h-5 ${
                isFullySetup ? "text-green-400" : needsMoreInfo ? "text-yellow-400" : "text-gray-400"
              }`} />
            </div>
            <div>
              <CardTitle className="text-lg">Payment Setup</CardTitle>
              <CardDescription>
                Receive payments for your training sessions
              </CardDescription>
            </div>
          </div>
          {isFullySetup && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
          {needsMoreInfo && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
              <AlertCircle className="w-3 h-3 mr-1" />
              Incomplete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isFullySetup ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Your payment account is active!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You can now receive payments for training sessions. A 1.5% platform fee is deducted from each booking.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">Charges</div>
                <div className="font-medium text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Enabled
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">Payouts</div>
                <div className="font-medium text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Enabled
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleContinueSetup} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Manage Stripe Account
            </Button>
          </div>
        ) : needsMoreInfo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Additional information needed</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Stripe account setup is incomplete. Please complete the onboarding process to start receiving payments.
            </p>
            <Button onClick={handleContinueSetup} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive payments for training sessions booked through the app. We use Stripe Connect for secure, hassle-free payments.
            </p>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Users pay for sessions through our secure checkout
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  A 1.5% platform fee is automatically deducted
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Remaining funds are transferred to your Stripe account
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Payouts happen automatically on your schedule
                </li>
              </ul>
            </div>
            <Button onClick={handleSetupStripe} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Set Up Stripe Account
                </>
              )}
            </Button>
            {stripeError && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg p-3">
                {stripeError}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Challenge Dialog Component
function formatSessionDate(dateValue) {
  if (!dateValue) return null;
  try {
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateValue;
  }
}

function formatSessionTime(timeValue) {
  if (!timeValue) return null;
  const [hours, minutes] = String(timeValue).split(":");
  if (hours == null || minutes == null) return timeValue;
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function TrainingSessionDialog({ session, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    id: session?.id,
    name: session?.name || "",
    description: session?.description || "",
    price: session?.price ?? 75,
    duration_minutes: session?.duration_minutes ?? 60,
    session_date: session?.session_date || "",
    start_time: session?.start_time ? String(session.start_time).slice(0, 5) : "",
    location: session?.location || "",
    skill_level: session?.skill_level || "all_levels",
    is_recurring: Boolean(session?.is_recurring),
    recurrence_days: normalizeRecurrenceDays(session?.recurrence_days),
  });

  useEffect(() => {
    if (open) {
      setFormError("");
      setFormData({
        id: session?.id,
        name: session?.name || "",
        description: session?.description || "",
        price: session?.price ?? 75,
        duration_minutes: session?.duration_minutes ?? 60,
        session_date: session?.session_date || "",
        start_time: session?.start_time
          ? String(session.start_time).slice(0, 5)
          : "",
        location: session?.location || "",
        skill_level: session?.skill_level || "all_levels",
        is_recurring: Boolean(session?.is_recurring),
        recurrence_days: normalizeRecurrenceDays(session?.recurrence_days),
      });
    }
  }, [open, session]);

  const toggleRecurrenceDay = (dayKey) => {
    setFormData((prev) => {
      const current = normalizeRecurrenceDays(prev.recurrence_days);
      const next = current.includes(dayKey)
        ? current.filter((d) => d !== dayKey)
        : [...current, dayKey];
      return { ...prev, recurrence_days: next };
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!formData.name.trim()) {
      setFormError("Session name is required");
      toast.error("Session name is required");
      return;
    }
    if (!formData.start_time) {
      setFormError("Start time is required");
      toast.error("Start time is required");
      return;
    }
    if (formData.is_recurring) {
      if (!normalizeRecurrenceDays(formData.recurrence_days).length) {
        setFormError("Pick at least one weekday for recurring sessions");
        toast.error("Pick at least one weekday for recurring sessions");
        return;
      }
    } else if (!formData.session_date) {
      setFormError("Pick a date for one-time sessions");
      toast.error("Pick a date for one-time sessions");
      return;
    }
    if (saving) return;

    setFormError("");
    setSaving(true);
    try {
      await onSave({
        ...formData,
        session_date: formData.is_recurring ? null : formData.session_date || null,
        start_time: formData.start_time || null,
        location: formData.location?.trim() || null,
        skill_level: formData.skill_level || "all_levels",
        is_recurring: Boolean(formData.is_recurring),
        recurrence_days: formData.is_recurring
          ? normalizeRecurrenceDays(formData.recurrence_days)
          : [],
      });
      setOpen(false);
    } catch (error) {
      setFormError(error?.message || "Could not save training session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => saving && e.preventDefault()}
        onEscapeKeyDown={(e) => saving && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {session ? "Edit Training Session" : "Add Training Session"}
          </DialogTitle>
          <DialogDescription>
            Athletes book these offerings — set skill level, time, and whether
            it repeats weekly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="1-on-1 Shooting Session"
            />
          </div>
          <div>
            <Label htmlFor="session-description">Description</Label>
            <Textarea
              id="session-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What athletes can expect from this session"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="session-skill-level">Skill Level</Label>
            <Select
              value={formData.skill_level}
              onValueChange={(value) =>
                setFormData({ ...formData, skill_level: value })
              }
            >
              <SelectTrigger id="session-skill-level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded"
                checked={formData.is_recurring}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_recurring: e.target.checked,
                    session_date: e.target.checked ? "" : formData.session_date,
                  })
                }
              />
              <div>
                <p className="font-medium text-sm">Recurring weekly</p>
                <p className="text-xs text-muted-foreground">
                  Replaces a general availability calendar — athletes only see
                  these days and this start time.
                </p>
              </div>
            </label>

            {formData.is_recurring ? (
              <div className="space-y-2">
                <Label>Days available</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map(({ key, label }) => {
                    const checked = formData.recurrence_days.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleRecurrenceDay(key)}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                          checked
                            ? "border-brand-orange bg-brand-orange/20 text-white"
                            : "border-border text-muted-foreground hover:border-gray-500"
                        }`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="session-date">Date</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={formData.session_date}
                  onChange={(e) =>
                    setFormData({ ...formData, session_date: e.target.value })
                  }
                />
              </div>
            )}

            <div>
              <Label htmlFor="session-start-time">Start Time</Label>
              <Input
                id="session-start-time"
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="session-location">Location</Label>
            <Input
              id="session-location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Gym name, court, address..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session-price">Price ($)</Label>
              <Input
                id="session-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="session-duration">Duration (min)</Label>
              <Input
                id="session-duration"
                type="number"
                min="15"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value, 10) || 60,
                  })
                }
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg p-3">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={handleSubmit}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : session ? (
                "Save Changes"
              ) : (
                "Create Session"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChallengeDialog({ challenge, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
      title: "",
      description: "",
      category: "shooting",
      difficulty: "beginner",
      duration_minutes: 20,
      xp_reward: 100,
      equipment_needed: [],
      is_featured: false,
    media_type: "",
    media_url: "",
    thumbnail_url: "",
  });

  useEffect(() => {
    if (challenge) {
      setFormData({
        ...challenge,
        media_type: challenge.media_type || "",
        media_url: challenge.media_url || "",
        thumbnail_url: challenge.thumbnail_url || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "shooting",
        difficulty: "beginner",
        duration_minutes: 20,
        xp_reward: 100,
        equipment_needed: [],
        is_featured: false,
        media_type: "",
        media_url: "",
        thumbnail_url: "",
      });
    }
  }, [challenge, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {challenge ? "Edit Workout" : "Create New Workout"}
          </DialogTitle>
          <DialogDescription>
            {challenge
              ? "Update your workout details"
              : "Create a new workout for your students"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shooting">Shooting</SelectItem>
                  <SelectItem value="dribbling">Dribbling</SelectItem>
                  <SelectItem value="defense">Defense</SelectItem>
                  <SelectItem value="conditioning">Conditioning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({ ...formData, difficulty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value),
                  })
                }
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="xp">XP Reward</Label>
              <Input
                id="xp"
                type="number"
                value={formData.xp_reward}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    xp_reward: parseInt(e.target.value),
                  })
                }
                min="0"
              />
            </div>
          </div>

          {/* Media Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Media (Optional)
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="media_type">Media Type</Label>
                <Select
                  value={formData.media_type || "none"}
                  onValueChange={(value) =>
                    setFormData({ 
                      ...formData, 
                      media_type: value === "none" ? "" : value,
                      media_url: value === "none" ? "" : formData.media_url,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Media</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.media_type === "image" && (
                <div className="space-y-2">
                  <Label htmlFor="media_url">Image URL</Label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        id="media_url"
                        value={formData.media_url}
                        onChange={(e) =>
                          setFormData({ ...formData, media_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <ImageUpload
                      onUploadComplete={(url) =>
                        setFormData({ ...formData, media_url: url })
                      }
                    />
                  </div>
                  {formData.media_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img
                        src={formData.media_url}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.media_type === "video" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="media_url">Video URL (YouTube or direct link)</Label>
                    <Input
                      id="media_url"
                      value={formData.media_url}
                      onChange={(e) =>
                        setFormData({ ...formData, media_url: e.target.value })
                      }
                      placeholder="https://youtube.com/watch?v=... or direct video URL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="thumbnail_url">Thumbnail Image URL (Optional)</Label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          id="thumbnail_url"
                          value={formData.thumbnail_url}
                          onChange={(e) =>
                            setFormData({ ...formData, thumbnail_url: e.target.value })
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <ImageUpload
                        onUploadComplete={(url) =>
                          setFormData({ ...formData, thumbnail_url: url })
                        }
                      />
                    </div>
                    {formData.thumbnail_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        <img
                          src={formData.thumbnail_url}
                          alt="Thumbnail Preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {challenge ? "Update" : "Create"} Workout
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Default availability schedule
const DEFAULT_AVAILABILITY = {
  monday: { start: "09:00", end: "17:00", enabled: true },
  tuesday: { start: "09:00", end: "17:00", enabled: true },
  wednesday: { start: "09:00", end: "17:00", enabled: true },
  thursday: { start: "09:00", end: "17:00", enabled: true },
  friday: { start: "09:00", end: "17:00", enabled: true },
  saturday: { start: "10:00", end: "14:00", enabled: false },
  sunday: { start: "10:00", end: "14:00", enabled: false },
};

// Event Dialog Component
function EventDialog({ event, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "09:00",
    location: "",
    event_type: "training",
    max_participants: 20,
    price: 0,
    duration_minutes: 60,
  });

  useEffect(() => {
    if (event) {
      const eventDate = event.date ? new Date(event.date) : new Date();
      setFormData({
        ...event,
        date: eventDate.toISOString().split("T")[0],
        time: eventDate.toTimeString().slice(0, 5),
        event_type: event.event_type || "training",
        max_participants: event.max_participants || event.spots_available || 20,
        price: event.price || 0,
        duration_minutes: event.duration_minutes || 60,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "09:00",
        location: "",
        event_type: "training",
        max_participants: 20,
        price: 0,
        duration_minutes: 60,
      });
    }
  }, [event, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Combine date and time into a single datetime
    const datetime = new Date(`${formData.date}T${formData.time}`);
    const submitData = {
      ...formData,
      date: datetime.toISOString(),
      id: event?.id,
    };
    delete submitData.time; // Remove the separate time field
    setIsSavingEvent(true);
    try {
      await onSave(submitData);
      setOpen(false);
    } catch (error) {
      console.error("Event save failed:", error);
    } finally {
      setIsSavingEvent(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "Update your event details"
              : "Create a new training event"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., Downtown Sports Center"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, event_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training Camp</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="clinic">Skills Clinic</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-duration">Duration (min)</Label>
              <Input
                id="event-duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value),
                  })
                }
                min="15"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-max">Max Participants</Label>
              <Input
                id="event-max"
                type="number"
                value={formData.max_participants}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_participants: parseInt(e.target.value),
                  })
                }
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="event-price">Price ($)</Label>
              <Input
                id="event-price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: parseFloat(e.target.value),
                  })
                }
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSavingEvent}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingEvent}>
              {isSavingEvent ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `${event ? "Update" : "Create"} Event`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Gallery Uploader Component
function GalleryUploader({ onAdd }) {
  const [mediaType, setMediaType] = useState("image");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [caption, setCaption] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!url.trim()) {
      toast.error("Please enter a URL or upload media");
      return;
    }

    const item = {
      type: mediaType,
      url: url.trim(),
      caption: caption.trim(),
    };

    if (mediaType === "video" && thumbnail.trim()) {
      item.thumbnail = thumbnail.trim();
    }

    onAdd(item);
    setUrl("");
    setThumbnail("");
    setCaption("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mediaType === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setMediaType("image")}
          >
            <Image className="w-4 h-4 mr-2" />
            Photo
          </Button>
          <Button
            type="button"
            variant={mediaType === "video" ? "default" : "outline"}
            size="sm"
            onClick={() => setMediaType("video")}
          >
            <Video className="w-4 h-4 mr-2" />
            Video
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {mediaType === "image" ? (
          <ImageUpload
            value={url}
            onChange={setUrl}
            label="Image"
          />
        ) : (
          <>
            <div>
              <Label htmlFor="gallery-video-url">Video URL (YouTube or direct link)</Label>
              <Input
                id="gallery-video-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or direct video URL"
              />
            </div>
            <ImageUpload
              value={thumbnail}
              onChange={setThumbnail}
              label="Thumbnail Image (Optional)"
            />
          </>
        )}

        <div>
          <Label htmlFor="gallery-caption">Caption (Optional)</Label>
          <Input
            id="gallery-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe this photo or video..."
          />
        </div>

        {/* Preview */}
        {url && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            {mediaType === "image" ? (
              <img
                src={url}
                alt="Preview"
                className="max-h-40 rounded object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded">
                <Play className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-300 truncate">{url}</span>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleAdd} disabled={!url.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Add to Gallery
        </Button>
      </div>
    </div>
  );
}

// Trainer Profile Form Component
function TrainerProfileForm({
  profile,
  onSave,
  requireFirstSession = false,
  onCreateFirstSession,
  onNeedSession,
  sessionCount = 0,
}) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    specializations: [],
    certifications: [],
    years_experience: 0,
    location: "",
    hourly_rate: 0,
    verified: false,
    availability_schedule: DEFAULT_AVAILABILITY,
    blocked_dates: [],
    session_buffer_minutes: 15,
    min_booking_notice_hours: 24,
  });
  const [firstSession, setFirstSession] = useState({
    name: "",
    description: "",
    price: 75,
    duration_minutes: 60,
    session_date: "",
    start_time: "10:00",
    location: "",
    skill_level: "all_levels",
    is_recurring: true,
    recurrence_days: ["monday", "wednesday", "friday"],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newCertification, setNewCertification] = useState({ name: "", issuer: "", year: new Date().getFullYear() });

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        specializations: profile.specializations || [],
        certifications: profile.certifications || [],
        years_experience: profile.years_experience || 0,
        location: profile.location || "",
        hourly_rate: profile.hourly_rate || 0,
        verified: profile.verified || false,
        availability_schedule: profile.availability_schedule || DEFAULT_AVAILABILITY,
        blocked_dates: profile.blocked_dates || [],
        session_buffer_minutes: profile.session_buffer_minutes || 15,
        min_booking_notice_hours: profile.min_booking_notice_hours || 24,
      });
    }
  }, [profile]);

  const addCertification = () => {
    if (newCertification.name.trim()) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, { ...newCertification }],
      });
      setNewCertification({ name: "", issuer: "", year: new Date().getFullYear() });
    }
  };

  const removeCertification = (index) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index),
    });
  };

  const addBlockedDate = () => {
    if (newBlockedDate && !formData.blocked_dates.includes(newBlockedDate)) {
      setFormData({
        ...formData,
        blocked_dates: [...formData.blocked_dates, newBlockedDate].sort(),
      });
      setNewBlockedDate("");
    }
  };

  const removeBlockedDate = (date) => {
    setFormData({
      ...formData,
      blocked_dates: formData.blocked_dates.filter((d) => d !== date),
    });
  };

  const toggleFirstSessionDay = (dayKey) => {
    setFirstSession((prev) => {
      const current = normalizeRecurrenceDays(prev.recurrence_days);
      const next = current.includes(dayKey)
        ? current.filter((d) => d !== dayKey)
        : [...current, dayKey];
      return { ...prev, recurrence_days: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (requireFirstSession) {
      if (!firstSession.name.trim()) {
        toast.error("Add a training session name to finish onboarding");
        return;
      }
      if (!firstSession.start_time) {
        toast.error("Set a start time for your first training session");
        return;
      }
      if (firstSession.is_recurring) {
        if (!normalizeRecurrenceDays(firstSession.recurrence_days).length) {
          toast.error("Pick at least one weekday for your recurring session");
          return;
        }
      } else if (!firstSession.session_date) {
        toast.error("Pick a date for your first training session");
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      await onSave(formData);

      if (requireFirstSession && onCreateFirstSession) {
        await onCreateFirstSession({
          ...firstSession,
          name: firstSession.name.trim(),
          description: firstSession.description?.trim() || "",
          location: firstSession.location?.trim() || null,
          skill_level: firstSession.skill_level || "all_levels",
          is_recurring: Boolean(firstSession.is_recurring),
          recurrence_days: firstSession.is_recurring
            ? normalizeRecurrenceDays(firstSession.recurrence_days)
            : [],
          session_date: firstSession.is_recurring
            ? null
            : firstSession.session_date || null,
        });
        onNeedSession?.();
      }

      setIsEditing(false);
    } catch (error) {
      // Keep the form open so the trainer can correct any validation/RLS issues.
      console.error("Trainer profile form submit failed:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        specializations: profile.specializations || [],
        certifications: profile.certifications || [],
        years_experience: profile.years_experience || 0,
        location: profile.location || "",
        hourly_rate: profile.hourly_rate || 0,
        verified: profile.verified || false,
        availability_schedule: profile.availability_schedule || DEFAULT_AVAILABILITY,
        blocked_dates: profile.blocked_dates || [],
        session_buffer_minutes: profile.session_buffer_minutes || 15,
        min_booking_notice_hours: profile.min_booking_notice_hours || 24,
      });
    }
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="min-w-0">
            <CardTitle>
              {profile ? "Trainer Profile" : "Create Trainer Profile"}
            </CardTitle>
            <CardDescription>
              This information will be visible to players looking to book
              sessions
            </CardDescription>
          </div>
          {profile && (
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
              disabled={isSavingProfile}
              className="w-full sm:w-auto"
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing || !profile ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={4}
                placeholder="Tell students about your experience and coaching style..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="City, State"
                />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.years_experience}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      years_experience: parseInt(e.target.value),
                    })
                  }
                  min="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input
                id="rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hourly_rate: parseFloat(e.target.value),
                  })
                }
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="specializations">Specializations</Label>
              <div className="space-y-2">
                <Input
                  id="specializations"
                  placeholder="Add specialization (press Enter to add)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = e.target.value.trim();
                      if (value && !formData.specializations.includes(value)) {
                        setFormData({
                          ...formData,
                          specializations: [...formData.specializations, value],
                        });
                        e.target.value = "";
                      }
                    }
                  }}
                />
                {formData.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.specializations.map((spec, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            specializations: formData.specializations.filter(
                              (_, i) => i !== index
                            ),
                          });
                        }}
                      >
                        {spec} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Press Enter to add specializations. Click on badges to remove
                  them.
                </p>
              </div>
            </div>

            {/* Certifications Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications & Qualifications
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your coaching certifications, licenses, and qualifications.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Certification name"
                    value={newCertification.name}
                    onChange={(e) =>
                      setNewCertification({ ...newCertification, name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Issuing organization"
                    value={newCertification.issuer}
                    onChange={(e) =>
                      setNewCertification({ ...newCertification, issuer: e.target.value })
                    }
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="number"
                      placeholder="Year"
                      value={newCertification.year}
                      onChange={(e) =>
                        setNewCertification({ ...newCertification, year: parseInt(e.target.value) })
                      }
                      min="1950"
                      max={new Date().getFullYear()}
                      className="w-full sm:w-24"
                    />
                    <Button type="button" variant="outline" onClick={addCertification} className="w-full sm:w-auto">
                      Add
                    </Button>
                  </div>
                </div>
                
                {formData.certifications.length > 0 && (
                  <div className="space-y-2">
                    {formData.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{cert.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {cert.issuer} {cert.year && `• ${cert.year}`}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.certifications.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No certifications added yet
                  </p>
                )}
              </div>
            </div>

            {/* Training schedule note — sessions replace availability calendar */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-2">Booking Schedule</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Athletes book from your <strong>Training Sessions</strong> only
                (one-time or recurring). The old weekly availability calendar is
                no longer used.
              </p>
              {profile && sessionCount === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onNeedSession?.()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add a training session
                </Button>
              )}
            </div>

            {requireFirstSession && (
              <div className="border-t pt-6 mt-6 space-y-4 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    First Training Session <span className="text-red-400">*</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Required to finish setup. Athletes will only see this
                    offering and its available times.
                  </p>
                </div>
                <div>
                  <Label>Session Name</Label>
                  <Input
                    value={firstSession.name}
                    onChange={(e) =>
                      setFirstSession({ ...firstSession, name: e.target.value })
                    }
                    placeholder="1-on-1 Skills Session"
                    required
                  />
                </div>
                <div>
                  <Label>Skill Level</Label>
                  <Select
                    value={firstSession.skill_level}
                    onValueChange={(value) =>
                      setFirstSession({ ...firstSession, skill_level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded"
                    checked={firstSession.is_recurring}
                    onChange={(e) =>
                      setFirstSession({
                        ...firstSession,
                        is_recurring: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <p className="font-medium text-sm">Recurring weekly</p>
                    <p className="text-xs text-muted-foreground">
                      Recommended for ongoing coaching availability
                    </p>
                  </div>
                </label>
                {firstSession.is_recurring ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map(({ key, label }) => {
                      const checked = firstSession.recurrence_days.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleFirstSessionDay(key)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                            checked
                              ? "border-brand-orange bg-brand-orange/20 text-white"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={firstSession.session_date}
                      onChange={(e) =>
                        setFirstSession({
                          ...firstSession,
                          session_date: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={firstSession.start_time}
                      onChange={(e) =>
                        setFirstSession({
                          ...firstSession,
                          start_time: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={firstSession.price}
                      onChange={(e) =>
                        setFirstSession({
                          ...firstSession,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={firstSession.duration_minutes}
                      onChange={(e) =>
                        setFirstSession({
                          ...firstSession,
                          duration_minutes: parseInt(e.target.value, 10) || 60,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Location (optional)</Label>
                  <Input
                    value={firstSession.location}
                    onChange={(e) =>
                      setFirstSession({
                        ...firstSession,
                        location: e.target.value,
                      })
                    }
                    placeholder="Gym / court"
                  />
                </div>
              </div>
            )}

            {/* Booking Settings */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Booking Settings</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buffer">Buffer Between Sessions (minutes)</Label>
                  <Input
                    id="buffer"
                    type="number"
                    value={formData.session_buffer_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        session_buffer_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="60"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Time between sessions for breaks
                  </p>
                </div>
                <div>
                  <Label htmlFor="notice">Minimum Booking Notice (hours)</Label>
                  <Input
                    id="notice"
                    type="number"
                    value={formData.min_booking_notice_hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_booking_notice_hours: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="168"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How far in advance bookings must be made
                  </p>
                </div>
              </div>
            </div>

            {/* Blocked Dates */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Blocked Dates</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Block specific dates when you're unavailable (vacation, holidays, etc.)
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full sm:w-48"
                />
                <Button type="button" variant="outline" onClick={addBlockedDate} className="w-full sm:w-auto">
                  Add Date
                </Button>
              </div>
              
              {formData.blocked_dates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.blocked_dates.map((date) => (
                    <Badge
                      key={date}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeBlockedDate(date)}
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      ×
                    </Badge>
                  ))}
                </div>
              )}
              
              {formData.blocked_dates.length === 0 && (
                <p className="text-sm text-muted-foreground">No blocked dates</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-6 border-t mt-6">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto">
                {isSavingProfile ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `${profile ? "Update" : "Create"} Profile`
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-base">{formData.name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Location
                    </Label>
                    <p className="text-base">
                      {formData.location || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Years of Experience
                    </Label>
                    <p className="text-base">
                      {formData.years_experience || 0} years
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Hourly Rate
                    </Label>
                    <p className="text-base">
                      ${formData.hourly_rate || 0}/hour
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Bio</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    {formData.bio ||
                      "No bio provided yet. Click 'Edit Profile' to add one."}
                  </p>
                </div>
              </div>
            </div>
            {formData.specializations &&
              formData.specializations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.specializations.map((spec, index) => (
                      <Badge key={index} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {/* Certifications Display */}
            {formData.certifications &&
              formData.certifications.length > 0 && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certifications & Qualifications
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {formData.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                      >
                        <div className="font-medium text-white">{cert.name}</div>
                        <div className="text-sm text-gray-400">
                          {cert.issuer} {cert.year && `• ${cert.year}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Booking schedule display */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                How Athletes Book
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Athletes choose one of your published Training Sessions and only
                see the dates/times those offerings allow
                {sessionCount > 0
                  ? ` (${sessionCount} active).`
                  : ". Add a session so athletes can book you."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Session Buffer</div>
                  <div className="font-medium text-white">{formData.session_buffer_minutes || 15} minutes</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Booking Notice</div>
                  <div className="font-medium text-white">{formData.min_booking_notice_hours || 24} hours</div>
                </div>
              </div>
            </div>

            {/* Blocked Dates Display */}
            {formData.blocked_dates && formData.blocked_dates.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CalendarX className="w-5 h-5" />
                  Blocked Dates
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.blocked_dates.map((date) => (
                    <Badge key={date} variant="outline">
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
