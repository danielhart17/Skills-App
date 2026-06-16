import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  Trophy,
  Calendar,
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
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
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

export default function TrainerDashboard() {
  const { isTrainer, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [_loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);

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
      } else if (activeTab === "bookings") {
        // Get trainer profile first to get the trainer_id
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
          console.log("Found trainer data:", trainerData);
          console.log("Looking for bookings with trainer_id:", trainerData.id);

          // First, let's check what the current user's auth context looks like
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          console.log("Current authenticated user:", currentUser);

          // Check the user's profile and role
          const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
          console.log(
            "User profile:",
            userProfile,
            "Profile error:",
            profileError
          );

          // Now fetch bookings using the trainer_id from the trainers table
          const { data, error } = await supabase
            .from("bookings")
            .select("*, profiles:user_id(full_name, email)")
            .eq("trainer_id", trainerData.id)
            .order("booking_datetime", { ascending: true });

          console.log("Bookings query result:", { data, error });

          if (error) {
            console.error("Error fetching bookings:", error);
            throw error;
          }
          setBookings(data || []);
        } else {
          // No trainer profile found
          console.log("No trainer profile found for user:", profile.id);
          setTrainerProfile(null);
          setBookings([]);
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
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [loadData, profile]);

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
        const { error } = await supabase.from("challenges").insert([saveData]);
        if (error) throw error;
        toast.success("Workout created successfully");
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto overflow-x-hidden">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold">Trainer Dashboard</h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your workouts, bookings, and profile
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 pb-1">
        <TabsList className="inline-flex w-max min-w-full gap-1 sm:grid sm:w-full sm:grid-cols-6">
          <TabsTrigger value="challenges" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Trophy className="w-4 h-4 mr-1.5 sm:mr-2" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="events" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <CalendarPlus className="w-4 h-4 mr-1.5 sm:mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="bookings" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Calendar className="w-4 h-4 mr-1.5 sm:mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="reviews" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Star className="w-4 h-4 mr-1.5 sm:mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="gallery" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <Images className="w-4 h-4 mr-1.5 sm:mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="profile" className="shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
            <User className="w-4 h-4 mr-1.5 sm:mr-2" />
            Profile
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Workouts Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              My Workouts ({challenges.length})
            </h2>
            <ChallengeDialog
              onSave={(data) => handleSaveChallenge(data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
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
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
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

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-2xl font-semibold">
            My Bookings ({bookings.length})
          </h2>

          {!trainerProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Set up your trainer profile to receive bookings
                </p>
                <Button onClick={() => setActiveTab("profile")}>
                  Create Trainer Profile
                </Button>
              </CardContent>
            </Card>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No bookings yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle>
                      {booking.profiles?.full_name || "Unknown User"}
                    </CardTitle>
                    <CardDescription>{booking.profiles?.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {new Date(booking.booking_datetime).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{booking.status}</Badge>
                        {booking.duration_minutes && (
                          <Badge variant="secondary">
                            {booking.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {booking.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                  Save your trainer profile first, then connect Stripe to receive payments.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          
          <TrainerProfileForm
            profile={trainerProfile}
            onSave={handleSaveProfile}
          />
        </TabsContent>
      </Tabs>
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

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

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
function TrainerProfileForm({ profile, onSave }) {
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

  const updateDayAvailability = (day, field, value) => {
    setFormData({
      ...formData,
      availability_schedule: {
        ...formData.availability_schedule,
        [day]: {
          ...formData.availability_schedule[day],
          [field]: value,
        },
      },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onSave(formData);
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

            {/* Availability Schedule Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Availability Schedule</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set your weekly availability for booking sessions.
              </p>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2 sm:w-32">
                      <input
                        type="checkbox"
                        id={`day-${key}`}
                        checked={formData.availability_schedule[key]?.enabled ?? false}
                        onChange={(e) => updateDayAvailability(key, "enabled", e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`day-${key}`} className="font-medium cursor-pointer">
                        {label}
                      </Label>
                    </div>
                    
                    {formData.availability_schedule[key]?.enabled && (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-1">
                        <Input
                          type="time"
                          value={formData.availability_schedule[key]?.start || "09:00"}
                          onChange={(e) => updateDayAvailability(key, "start", e.target.value)}
                          className="w-full sm:w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={formData.availability_schedule[key]?.end || "17:00"}
                          onChange={(e) => updateDayAvailability(key, "end", e.target.value)}
                          className="w-full sm:w-32"
                        />
                      </div>
                    )}
                    
                    {!formData.availability_schedule[key]?.enabled && (
                      <span className="text-muted-foreground text-sm">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

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

            {/* Availability Display */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Availability Schedule
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const daySchedule = formData.availability_schedule?.[key];
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border ${
                        daySchedule?.enabled
                          ? "bg-green-900/30 border-green-700"
                          : "bg-gray-800/50 border-gray-700"
                      }`}
                    >
                      <div className={`font-medium text-sm ${
                        daySchedule?.enabled ? "text-green-400" : "text-gray-400"
                      }`}>
                        {label}
                      </div>
                      {daySchedule?.enabled ? (
                        <div className="text-xs text-green-300/80 mt-1">
                          {daySchedule.start} - {daySchedule.end}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">
                          Unavailable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

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
