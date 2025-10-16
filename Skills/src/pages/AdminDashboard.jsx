import { useState, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/api/supabaseClient";
import {
  BookOpen,
  Trophy,
  Calendar,
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  CalendarCheck,
  Search,
  HelpCircle,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lessons");
  const [lessons, setLessons] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [drills, setDrills] = useState([]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  const loadData = useCallback(async () => {
    console.log("AdminDashboard: Loading data for tab:", activeTab);
    try {
      if (activeTab === "lessons") {
        console.log("AdminDashboard: Fetching lessons...");
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .order("created_at", { ascending: false });
        console.log("AdminDashboard: Lessons result:", { data, error });
        if (error) throw error;
        setLessons(data || []);
      } else if (activeTab === "challenges") {
        console.log("AdminDashboard: Fetching challenges...");
        const { data, error } = await supabase
          .from("challenges")
          .select("*")
          .order("created_at", { ascending: false });
        console.log("AdminDashboard: Challenges result:", { data, error });
        if (error) throw error;
        setChallenges(data || []);
      } else if (activeTab === "events") {
        console.log("AdminDashboard: Fetching events...");
        const { data, error } = await supabase
          .from("training_events")
          .select("*")
          .order("date", { ascending: false });
        console.log("AdminDashboard: Events result:", { data, error });
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === "bookings") {
        console.log("AdminDashboard: Fetching bookings...");
        const { data, error } = await supabase
          .from("bookings")
          .select(
            "*, profiles:user_id(full_name, email), trainers:trainer_id(name)"
          )
          .order("booking_datetime", { ascending: false });
        console.log("AdminDashboard: Bookings result:", { data, error });
        if (error) throw error;
        setBookings(data || []);
      } else if (activeTab === "users") {
        console.log("AdminDashboard: Fetching users...");
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        console.log("AdminDashboard: Users result:", { data, error });
        if (error) throw error;
        setProfiles(data || []);
      } else if (activeTab === "drills") {
        console.log("AdminDashboard: Fetching drills...");
        const { data, error } = await supabase
          .from("drills")
          .select("*")
          .order("created_at", { ascending: false });
        console.log("AdminDashboard: Drills result:", { data, error });
        if (error) throw error;
        setDrills(data || []);
      }
    } catch (error) {
      console.error("AdminDashboard: Error loading data:", error);
      toast.error("Failed to load data");
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (table, id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;
      toast.success("Item deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleSave = async (table, data, isEdit = false) => {
    try {
      const saveData = {
        ...data,
        created_by: profile.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from(table)
          .update(saveData)
          .eq("id", data.id);
        if (error) throw error;
        toast.success("Updated successfully");
      } else {
        const { error } = await supabase.from(table).insert([saveData]);
        if (error) throw error;
        toast.success("Created successfully");
      }

      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      toast.success("User role updated");
      loadData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const loadQuestionsForLesson = async (lessonId) => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load questions");
    }
  };

  const handleManageQuestions = async (lesson) => {
    setSelectedLesson(lesson);
    await loadQuestionsForLesson(lesson.id);
    setShowQuestionsDialog(true);
  };

  const handleSaveQuestion = async (questionData, isEdit = false) => {
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", questionData.id);
        if (error) throw error;
        toast.success("Question updated");
      } else {
        const { error } = await supabase
          .from("questions")
          .insert({ ...questionData, lesson_id: selectedLesson.id });
        if (error) throw error;
        toast.success("Question created");
      }
      await loadQuestionsForLesson(selectedLesson.id);
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;
      toast.success("Question deleted");
      await loadQuestionsForLesson(selectedLesson.id);
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage all content and users</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="lessons">
            <BookOpen className="w-4 h-4 mr-2" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="drills">
            <Target className="w-4 h-4 mr-2" />
            Drills
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Trophy className="w-4 h-4 mr-2" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <CalendarCheck className="w-4 h-4 mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Lessons ({lessons.length})
            </h2>
            <LessonDialog
              onSave={(data) => handleSave("lessons", data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lesson
                </Button>
              }
            />
          </div>

          <div className="grid gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{lesson.title}</CardTitle>
                      <CardDescription>{lesson.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageQuestions(lesson)}
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        Questions
                      </Button>
                      <LessonDialog
                        lesson={lesson}
                        onSave={(data) => handleSave("lessons", data, true)}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete("lessons", lesson.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>Learn</Badge>
                    <Badge variant="outline">{lesson.difficulty}</Badge>
                    <Badge variant="secondary">Level {lesson.level}</Badge>
                    <Badge variant="secondary">
                      {lesson.estimated_time} min
                    </Badge>
                    <Badge variant="secondary">{lesson.xp_reward} XP</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Drills Tab */}
        <TabsContent value="drills" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Drills ({drills.length})</h2>
            <DrillDialog
              onSave={(data) => handleSave("drills", data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Drill
                </Button>
              }
            />
          </div>

          <div className="grid gap-4">
            {drills.map((drill) => (
              <Card key={drill.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{drill.title}</CardTitle>
                      <CardDescription>{drill.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <DrillDialog
                        drill={drill}
                        onSave={(data) => handleSave("drills", data, true)}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete("drills", drill.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      <Badge>{drill.category}</Badge>
                      <Badge variant="outline">{drill.difficulty}</Badge>
                      <Badge variant="secondary">
                        {drill.duration_minutes} min
                      </Badge>
                      <Badge variant="secondary">
                        {drill.players_needed} player
                        {drill.players_needed > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        <strong>Purpose:</strong> {drill.purpose}
                      </p>
                      <p>
                        <strong>Focus:</strong> {drill.focus}
                      </p>
                      <p>
                        <strong>Equipment:</strong>{" "}
                        {drill.equipment_needed?.join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Challenges ({challenges.length})
            </h2>
            <ChallengeDialog
              onSave={(data) => handleSave("challenges", data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Challenge
                </Button>
              }
            />
          </div>

          <div className="grid gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{challenge.title}</CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <ChallengeDialog
                        challenge={challenge}
                        onSave={(data) => handleSave("challenges", data, true)}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete("challenges", challenge.id)}
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
                    <Badge variant="secondary">{challenge.xp_reward} XP</Badge>
                    {challenge.is_featured && <Badge>Featured</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Events ({events.length})</h2>
            <EventDialog
              onSave={(data) => handleSave("training_events", data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              }
            />
          </div>

          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>{event.location}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <EventDialog
                        event={event}
                        onSave={(data) =>
                          handleSave("training_events", data, true)
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
                          handleDelete("training_events", event.id)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>{new Date(event.date).toLocaleDateString()}</Badge>
                    <Badge variant="secondary">${event.price}</Badge>
                    <Badge variant="outline">
                      {event.spots_available} spots
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-2xl font-semibold">
            All Bookings ({bookings.length})
          </h2>

          <div className="grid gap-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {booking.profiles?.full_name || "Unknown User"}
                      </CardTitle>
                      <CardDescription>
                        {booking.profiles?.email}
                      </CardDescription>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {new Date(booking.booking_datetime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">
                        Trainer: {booking.trainers?.name || "N/A"}
                      </Badge>
                      {booking.duration_minutes && (
                        <Badge variant="secondary">
                          {booking.duration_minutes} min
                        </Badge>
                      )}
                      {booking.total_price && (
                        <Badge variant="secondary">
                          ${booking.total_price}
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Users ({profiles.length})
            </h2>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {profiles
              .filter(
                (user) =>
                  user.full_name
                    ?.toLowerCase()
                    .includes(userSearch.toLowerCase()) ||
                  user.email?.toLowerCase().includes(userSearch.toLowerCase())
              )
              .map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{user.full_name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleUpdateUserRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {user.role !== "trainer" && (
                        <>
                          <Badge>Level {user.current_level}</Badge>
                          <Badge variant="secondary">{user.total_xp} XP</Badge>
                          <Badge variant="outline">
                            Streak: {user.current_streak}
                          </Badge>
                        </>
                      )}
                      {user.role === "trainer" && (
                        <Badge variant="outline">Trainer Account</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Questions Management Dialog */}
      {showQuestionsDialog && selectedLesson && (
        <Dialog
          open={showQuestionsDialog}
          onOpenChange={setShowQuestionsDialog}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Manage Questions: {selectedLesson.title}
              </DialogTitle>
              <DialogDescription>
                Add and manage multiple-choice questions for this lesson.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {questions.length} question(s)
                </p>
                <QuestionDialog
                  lessonId={selectedLesson.id}
                  onSave={(data) => handleSaveQuestion(data)}
                  trigger={
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  }
                />
              </div>

              <div className="space-y-3">
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>Q{index + 1}</Badge>
                            <span className="text-sm font-medium">
                              {question.question_text}
                            </span>
                          </div>
                          {question.media_type !== "none" && (
                            <Badge variant="outline" className="text-xs">
                              {question.media_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <QuestionDialog
                            question={question}
                            lessonId={selectedLesson.id}
                            onSave={(data) => handleSaveQuestion(data, true)}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>A: {question.option_a}</div>
                        <div>B: {question.option_b}</div>
                        <div>C: {question.option_c}</div>
                        <div>D: {question.option_d}</div>
                      </div>
                      <div className="mt-2">
                        <Badge className="bg-green-100 text-green-800">
                          Correct: {question.correct_answer}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Question Dialog Component
function QuestionDialog({ question, lessonId, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    question || {
      question_text: "",
      media_type: "none",
      media_url: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      explanation: "",
      order_index: 0,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(question ? { ...formData, id: question.id } : formData);
    setOpen(false);
    if (!question) {
      setFormData({
        question_text: "",
        media_type: "none",
        media_url: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
        order_index: 0,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit" : "Add"} Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) =>
                setFormData({ ...formData, question_text: e.target.value })
              }
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="media_type">Media Type</Label>
              <Select
                value={formData.media_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, media_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.media_type !== "none" && (
              <div>
                <Label htmlFor="media_url">Media URL</Label>
                <Input
                  id="media_url"
                  type="url"
                  value={formData.media_url}
                  onChange={(e) =>
                    setFormData({ ...formData, media_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Answer Options *</Label>
            <div>
              <Label htmlFor="option_a" className="text-sm">
                Option A
              </Label>
              <Input
                id="option_a"
                value={formData.option_a}
                onChange={(e) =>
                  setFormData({ ...formData, option_a: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="option_b" className="text-sm">
                Option B
              </Label>
              <Input
                id="option_b"
                value={formData.option_b}
                onChange={(e) =>
                  setFormData({ ...formData, option_b: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="option_c" className="text-sm">
                Option C
              </Label>
              <Input
                id="option_c"
                value={formData.option_c}
                onChange={(e) =>
                  setFormData({ ...formData, option_c: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="option_d" className="text-sm">
                Option D
              </Label>
              <Input
                id="option_d"
                value={formData.option_d}
                onChange={(e) =>
                  setFormData({ ...formData, option_d: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="correct_answer">Correct Answer *</Label>
            <Select
              value={formData.correct_answer}
              onValueChange={(value) =>
                setFormData({ ...formData, correct_answer: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              rows={2}
              placeholder="Explain why this answer is correct..."
            />
          </div>

          <div>
            <Label htmlFor="order_index">Order Index</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order_index: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Question</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Lesson Dialog Component
function LessonDialog({ lesson, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    lesson || {
      title: "",
      description: "",
      chapter: "",
      difficulty: "beginner",
      level: 1,
      estimated_time: 10,
      xp_reward: 50,
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
            {lesson ? "Edit Lesson" : "Create New Lesson"}
          </DialogTitle>
          <DialogDescription>
            {lesson
              ? "Update lesson details"
              : "Add a new lesson to the platform"}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                type="number"
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: parseInt(e.target.value) })
                }
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="time">Time (min)</Label>
              <Input
                id="time"
                type="number"
                value={formData.estimated_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_time: parseInt(e.target.value),
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
          <div>
            <Label htmlFor="chapter">Chapter</Label>
            <Input
              id="chapter"
              value={formData.chapter}
              onChange={(e) =>
                setFormData({ ...formData, chapter: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{lesson ? "Update" : "Create"} Lesson</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
              ? "Update challenge details"
              : "Add a new challenge to the platform"}
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
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.is_featured}
              onChange={(e) =>
                setFormData({ ...formData, is_featured: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="featured">Featured Challenge</Label>
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

// Event Dialog Component
function EventDialog({ event, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    event || {
      title: "",
      date: new Date().toISOString().split("T")[0],
      location: "",
      price: 0,
      spots_available: 10,
      trainer_id: null,
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
          <DialogTitle>{event ? "Edit Event" : "Create New Event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update event details"
              : "Add a new training event to the platform"}
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
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., LA Sports Center"
              required
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
                required
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
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-spots">Available Spots</Label>
            <Input
              id="event-spots"
              type="number"
              value={formData.spots_available}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spots_available: parseInt(e.target.value),
                })
              }
              min="1"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{event ? "Update" : "Create"} Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Drill Dialog Component
function DrillDialog({ drill, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    purpose: "",
    setup: "",
    instructions: "",
    focus: "",
    category: "shooting",
    difficulty: "beginner",
    duration_minutes: 15,
    equipment_needed: [],
    players_needed: 1,
    space_required: "Half court",
    is_active: true,
  });

  useEffect(() => {
    if (drill) {
      setFormData({
        title: drill.title || "",
        description: drill.description || "",
        purpose: drill.purpose || "",
        setup: drill.setup || "",
        instructions: drill.instructions || "",
        focus: drill.focus || "",
        category: drill.category || "shooting",
        difficulty: drill.difficulty || "beginner",
        duration_minutes: drill.duration_minutes || 15,
        equipment_needed: drill.equipment_needed || [],
        players_needed: drill.players_needed || 1,
        space_required: drill.space_required || "Half court",
        is_active: drill.is_active !== false,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        purpose: "",
        setup: "",
        instructions: "",
        focus: "",
        category: "shooting",
        difficulty: "beginner",
        duration_minutes: 15,
        equipment_needed: [],
        players_needed: 1,
        space_required: "Half court",
        is_active: true,
      });
    }
  }, [drill, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, id: drill?.id });
    setOpen(false);
  };

  const handleEquipmentChange = (e) => {
    const value = e.target.value;
    const equipment = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    setFormData({ ...formData, equipment_needed: equipment });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{drill ? "Edit Drill" : "Create New Drill"}</DialogTitle>
          <DialogDescription>
            {drill ? "Update the drill details" : "Add a new basketball drill"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="drill-title">Title</Label>
            <Input
              id="drill-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="drill-description">Description</Label>
            <Textarea
              id="drill-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="drill-purpose">Purpose</Label>
            <Textarea
              id="drill-purpose"
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              rows={2}
              required
            />
          </div>
          <div>
            <Label htmlFor="drill-setup">Setup</Label>
            <Textarea
              id="drill-setup"
              value={formData.setup}
              onChange={(e) =>
                setFormData({ ...formData, setup: e.target.value })
              }
              rows={2}
              required
            />
          </div>
          <div>
            <Label htmlFor="drill-instructions">Instructions</Label>
            <Textarea
              id="drill-instructions"
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              rows={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="drill-focus">Focus</Label>
            <Textarea
              id="drill-focus"
              value={formData.focus}
              onChange={(e) =>
                setFormData({ ...formData, focus: e.target.value })
              }
              rows={2}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="drill-category">Category</Label>
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
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="conditioning">Conditioning</SelectItem>
                  <SelectItem value="footwork">Footwork</SelectItem>
                  <SelectItem value="rebounding">Rebounding</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="drill-difficulty">Difficulty</Label>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="drill-duration">Duration (min)</Label>
              <Input
                id="drill-duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value),
                  })
                }
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="drill-players">Players Needed</Label>
              <Input
                id="drill-players"
                type="number"
                value={formData.players_needed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    players_needed: parseInt(e.target.value),
                  })
                }
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="drill-space">Space Required</Label>
              <Input
                id="drill-space"
                value={formData.space_required}
                onChange={(e) =>
                  setFormData({ ...formData, space_required: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="drill-equipment">
              Equipment Needed (comma-separated)
            </Label>
            <Input
              id="drill-equipment"
              value={formData.equipment_needed.join(", ")}
              onChange={handleEquipmentChange}
              placeholder="Basketball, Cones, etc."
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="drill-active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="drill-active">Active Drill</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{drill ? "Update" : "Create"} Drill</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
