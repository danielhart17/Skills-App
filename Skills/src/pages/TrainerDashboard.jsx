import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Trophy,
  Calendar,
  User,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  Star,
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("challenges");
  const [challenges, setChallenges] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not trainer or admin
  useEffect(() => {
    if (!isTrainer()) {
      navigate("/home");
    }
  }, [isTrainer, navigate]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
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
        // Get trainer profile first
        const { data: trainerData } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerData) {
          setTrainerProfile(trainerData);
          const { data, error } = await supabase
            .from("bookings")
            .select("*, profiles:user_id(full_name, email)")
            .eq("trainer_id", trainerData.id)
            .order("booking_datetime", { ascending: true });
          if (error) throw error;
          setBookings(data || []);
        }
      } else if (activeTab === "reviews") {
        // Get trainer profile first
        const { data: trainerData } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (trainerData) {
          const { data, error } = await supabase
            .from("reviews")
            .select("*, profiles:user_id(full_name, email)")
            .eq("trainer_id", trainerData.id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          setReviews(data || []);
        }
      } else if (activeTab === "profile") {
        const { data, error } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", profile.id)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        setTrainerProfile(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;

    try {
      const { error } = await supabase.from("challenges").delete().eq("id", id);

      if (error) throw error;
      toast.success("Challenge deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete challenge");
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
        toast.success("Challenge updated successfully");
      } else {
        const { error } = await supabase.from("challenges").insert([saveData]);
        if (error) throw error;
        toast.success("Challenge created successfully");
      }

      loadData();
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast.error("Failed to save challenge");
    }
  };

  const handleSaveProfile = async (data) => {
    try {
      if (trainerProfile) {
        const { error } = await supabase
          .from("trainers")
          .update(data)
          .eq("id", trainerProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trainers")
          .insert([{ ...data, user_id: profile.id }]);
        if (error) throw error;
      }

      toast.success("Profile updated successfully");
      loadData();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    }
  };

  if (!isTrainer()) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your challenges, bookings, and profile
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges">
            <Trophy className="w-4 h-4 mr-2" />
            My Challenges
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Calendar className="w-4 h-4 mr-2" />
            My Bookings
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="w-4 h-4 mr-2" />
            My Reviews
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Trainer Profile
          </TabsTrigger>
        </TabsList>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              My Challenges ({challenges.length})
            </h2>
            <ChallengeDialog
              onSave={(data) => handleSaveChallenge(data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Challenge
                </Button>
              }
            />
          </div>

          {challenges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No challenges yet. Create your first challenge!
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

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <h2 className="text-2xl font-semibold">Trainer Profile</h2>
          <TrainerProfileForm
            profile={trainerProfile}
            onSave={handleSaveProfile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Challenge Dialog Component
function ChallengeDialog({ challenge, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    challenge || {
      title: "",
      description: "",
      category: "shooting",
      difficulty: "beginner",
      duration_minutes: 20,
      xp_reward: 100,
      equipment_needed: [],
      is_featured: false,
    }
  );

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
            {challenge ? "Edit Challenge" : "Create New Challenge"}
          </DialogTitle>
          <DialogDescription>
            {challenge
              ? "Update your challenge details"
              : "Create a new challenge for your students"}
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
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {challenge ? "Update" : "Create"} Challenge
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Trainer Profile Form Component
function TrainerProfileForm({ profile, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    specializations: [],
    years_experience: 0,
    location: "",
    hourly_rate: 0,
    verified: false,
  });
  const [isEditing, setIsEditing] = useState(false);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        specializations: profile.specializations || [],
        years_experience: profile.years_experience || 0,
        location: profile.location || "",
        hourly_rate: profile.hourly_rate || 0,
        verified: profile.verified || false,
      });
    }
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        specializations: profile.specializations || [],
        years_experience: profile.years_experience || 0,
        location: profile.location || "",
        hourly_rate: profile.hourly_rate || 0,
        verified: profile.verified || false,
      });
    }
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="flex justify-end gap-2">
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {profile ? "Update" : "Create"} Profile
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
