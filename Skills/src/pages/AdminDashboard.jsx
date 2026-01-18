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
import { Chapter } from "@/api/entities";
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
  Brain,
  Dumbbell,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";

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
  const [questionCounts, setQuestionCounts] = useState({});
  const [eventRegistrations, setEventRegistrations] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationsDialog, setShowRegistrationsDialog] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [examQuestions, setExamQuestions] = useState([]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  // Load chapters on mount
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const allChapters = await Chapter.list();
        setChapters(allChapters);
      } catch (error) {
        console.error("Error loading chapters:", error);
      }
    };
    loadChapters();
  }, []);

  const loadData = useCallback(async () => {
    try {
      if (activeTab === "lessons") {
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setLessons(data || []);

        // Fetch question counts for each lesson
        if (data && data.length > 0) {
          const counts = {};
          await Promise.all(
            data.map(async (lesson) => {
              const { count, error: countError } = await supabase
                .from("questions")
                .select("*", { count: "exact", head: true })
                .eq("lesson_id", lesson.id);
              if (!countError) {
                counts[lesson.id] = count || 0;
              }
            })
          );
          setQuestionCounts(counts);
        }
      } else if (activeTab === "challenges") {
        const { data, error } = await supabase
          .from("challenges")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setChallenges(data || []);
      } else if (activeTab === "events") {
        const { data, error } = await supabase
          .from("training_events")
          .select("*")
          .order("date", { ascending: false });
        if (error) throw error;
        setEvents(data || []);

        // Fetch registration counts for each event
        if (data && data.length > 0) {
          const registrations = {};
          await Promise.all(
            data.map(async (event) => {
              const { data: regData, error: regError } = await supabase
                .from("event_registrations")
                .select("*, profiles:user_id(full_name, email)")
                .eq("event_id", event.id)
                .order("created_at", { ascending: false });
              if (!regError) {
                registrations[event.id] = regData || [];
              }
            })
          );
          setEventRegistrations(registrations);
        }
      } else if (activeTab === "bookings") {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            "*, profiles:user_id(full_name, email), trainers:trainer_id(name)"
          )
          .order("booking_datetime", { ascending: false });
        if (error) throw error;
        setBookings(data || []);
      } else if (activeTab === "users") {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setProfiles(data || []);
      } else if (activeTab === "exam") {
        const { data, error } = await supabase
          .from("exam_questions")
          .select("*")
          .order("difficulty")
          .order("order_index");
        if (error) throw error;
        setExamQuestions(data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
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
      let saveData = {
        ...data,
        created_by: profile.id,
      };

      // Special handling for lessons with new chapters
      if (table === "lessons" && data.chapter && !data.chapter_id) {
        // Check if chapter already exists
        const { data: existingChapters } = await supabase
          .from("chapters")
          .select("*")
          .eq("title", data.chapter)
          .eq("mode", data.mode);

        if (existingChapters && existingChapters.length > 0) {
          // Use existing chapter
          saveData.chapter_id = existingChapters[0].id;
        } else {
          // Create new chapter
          console.log("📚 Creating new chapter:", data.chapter);
          
          // Get max order_index for this mode
          const { data: maxOrderData } = await supabase
            .from("chapters")
            .select("order_index")
            .eq("mode", data.mode)
            .order("order_index", { ascending: false })
            .limit(1);

          const nextOrderIndex = maxOrderData && maxOrderData.length > 0 
            ? (maxOrderData[0].order_index || 0) + 1 
            : 1;

          const { data: newChapter, error: chapterError } = await supabase
            .from("chapters")
            .insert([
              {
                title: data.chapter,
                description: `Learn about ${data.chapter}`,
                mode: data.mode,
                order_index: nextOrderIndex,
                is_active: true,
              },
            ])
            .select()
            .single();

          if (chapterError) {
            console.error("Error creating chapter:", chapterError);
            throw chapterError;
          }

          console.log("✅ Chapter created:", newChapter);
          saveData.chapter_id = newChapter.id;
          toast.success(`Chapter "${data.chapter}" created!`);
        }
      }

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
      toast.error(error.message || "Failed to save");
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

  const handleViewRegistrations = (event) => {
    setSelectedEvent(event);
    setShowRegistrationsDialog(true);
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

      // Update question count
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("lesson_id", selectedLesson.id);
      setQuestionCounts((prev) => ({
        ...prev,
        [selectedLesson.id]: count || 0,
      }));
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

      // Update question count
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("lesson_id", selectedLesson.id);
      setQuestionCounts((prev) => ({
        ...prev,
        [selectedLesson.id]: count || 0,
      }));
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  // Entry Exam Question Handlers
  const handleSaveExamQuestion = async (questionData, isEdit = false) => {
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("exam_questions")
          .update(questionData)
          .eq("id", questionData.id);
        if (error) throw error;
        toast.success("Exam question updated");
      } else {
        const { error } = await supabase
          .from("exam_questions")
          .insert(questionData);
        if (error) throw error;
        toast.success("Exam question created");
      }
      loadData();
    } catch (error) {
      console.error("Error saving exam question:", error);
      toast.error("Failed to save exam question");
    }
  };

  const handleDeleteExamQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this exam question?")) return;

    try {
      const { error } = await supabase
        .from("exam_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;
      toast.success("Exam question deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting exam question:", error);
      toast.error("Failed to delete exam question");
    }
  };

  const recalculateAllChapterXP = async () => {
    try {
      toast.info("Recalculating XP for all chapters...");
      
      for (const chapter of chapters) {
        const { data: chapterLessons } = await supabase
          .from("lessons")
          .select("xp_reward")
          .eq("chapter_id", chapter.id);

        const totalXP = chapterLessons
          ? chapterLessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0)
          : 0;

        await supabase
          .from("chapters")
          .update({ total_xp: totalXP })
          .eq("id", chapter.id);

        console.log(`✅ Updated ${chapter.title}: ${totalXP} XP`);
      }

      toast.success("All chapter XP recalculated!");
      loadData();
    } catch (error) {
      console.error("Error recalculating XP:", error);
      toast.error("Failed to recalculate XP");
    }
  };

  const handleSaveChapter = async (chapterData, isEdit = false) => {
    try {
      const { selectedLessons, ...saveData } = chapterData;

      // Calculate total XP from selected lessons
      const totalXP = selectedLessons
        ? selectedLessons.reduce((sum, lessonId) => {
            const lesson = lessons.find((l) => l.id === lessonId);
            return sum + (lesson?.xp_reward || 0);
          }, 0)
        : 0;

      saveData.total_xp = totalXP;

      console.log("💾 Saving chapter with total_xp:", totalXP, "saveData:", saveData);

      if (isEdit) {
        // Update chapter
        const { error } = await supabase
          .from("chapters")
          .update(saveData)
          .eq("id", chapterData.id);
        if (error) throw error;

        // Update lessons to belong to this chapter
        if (selectedLessons) {
          // First, remove chapter_id from all lessons that were in this chapter
          await supabase
            .from("lessons")
            .update({ chapter_id: null })
            .eq("chapter_id", chapterData.id);

          // Then assign selected lessons to this chapter and update their order
          if (selectedLessons.length > 0) {
            // Update each lesson with its position
            for (let i = 0; i < selectedLessons.length; i++) {
              await supabase
                .from("lessons")
                .update({ 
                  chapter_id: chapterData.id,
                  order_index: i + 1 
                })
                .eq("id", selectedLessons[i]);
            }
          }
        }

        // Recalculate and update total_xp after lesson assignment
        const { data: updatedLessons } = await supabase
          .from("lessons")
          .select("xp_reward")
          .eq("chapter_id", chapterData.id);

        const finalTotalXP = updatedLessons
          ? updatedLessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0)
          : 0;

        await supabase
          .from("chapters")
          .update({ total_xp: finalTotalXP })
          .eq("id", chapterData.id);

        console.log("✅ Chapter updated with final total_xp:", finalTotalXP);
        toast.success("Chapter updated successfully");
      } else {
        // Create new chapter
        const { data: newChapter, error } = await supabase
          .from("chapters")
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;

        // Assign selected lessons to new chapter with order
        if (selectedLessons && selectedLessons.length > 0) {
          for (let i = 0; i < selectedLessons.length; i++) {
            await supabase
              .from("lessons")
              .update({ 
                chapter_id: newChapter.id,
                order_index: i + 1 
              })
              .eq("id", selectedLessons[i]);
          }

          // Recalculate total_xp after assignment
          const { data: assignedLessons } = await supabase
            .from("lessons")
            .select("xp_reward")
            .eq("chapter_id", newChapter.id);

          const finalTotalXP = assignedLessons
            ? assignedLessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0)
            : 0;

          await supabase
            .from("chapters")
            .update({ total_xp: finalTotalXP })
            .eq("id", newChapter.id);

          console.log("✅ New chapter created with total_xp:", finalTotalXP);
        }

        toast.success("Chapter created successfully");
      }

      loadData();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error(error.message || "Failed to save chapter");
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="chapters">
            <BookOpen className="w-4 h-4 mr-2" />
            Chapters
          </TabsTrigger>
          <TabsTrigger value="lessons">
            <BookOpen className="w-4 h-4 mr-2" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="exam">
            <Brain className="w-4 h-4 mr-2" />
            Entry Exam
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

        {/* Chapters Tab */}
        <TabsContent value="chapters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Chapters ({chapters.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={recalculateAllChapterXP}
              >
                Recalculate All XP
              </Button>
              <ChapterDialog
                onSave={(data) => handleSaveChapter(data)}
                lessons={lessons}
                trigger={
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                }
              />
            </div>
          </div>

          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <Card key={chapter.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {chapter.title}
                        <Badge variant={chapter.mode === "iq" ? "default" : "secondary"}>
                          {chapter.mode === "iq" ? (
                            <>
                              <Brain className="w-3 h-3 mr-1" />
                              IQ Mode
                            </>
                          ) : (
                            <>
                              <Dumbbell className="w-3 h-3 mr-1" />
                              On Court
                            </>
                          )}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{chapter.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <ChapterDialog
                        chapter={chapter}
                        onSave={(data) => handleSaveChapter(data, true)}
                        lessons={lessons}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete("chapters", chapter.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order:</span>
                      <span className="ml-2 font-semibold">#{chapter.order_index}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lessons:</span>
                      <span className="ml-2 font-semibold">
                        {lessons.filter((l) => l.chapter_id === chapter.id).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total XP:</span>
                      <span className="ml-2 font-semibold">{chapter.total_xp || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={chapter.is_active ? "default" : "secondary"}>
                        {chapter.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Lessons ({lessons.length})
            </h2>
            <LessonDialog
              chapters={chapters}
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
                        Questions ({questionCounts[lesson.id] || 0})
                      </Button>
                      <LessonDialog
                        lesson={lesson}
                        chapters={chapters}
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
                    <Badge
                      className={`${
                        lesson.mode === "iq"
                          ? "bg-blue-500 hover:bg-blue-600"
                          : "bg-orange-500 hover:bg-orange-600"
                      }`}
                    >
                      {lesson.mode === "iq" ? (
                        <Brain className="w-3 h-3 mr-1" />
                      ) : (
                        <Dumbbell className="w-3 h-3 mr-1" />
                      )}
                      {lesson.mode === "iq" ? "IQ Mode" : "On Court"}
                    </Badge>
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

        {/* Entry Exam Tab */}
        <TabsContent value="exam" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">
                Entry Exam Questions ({examQuestions.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage questions for the entry assessment (4 beginner, 4 intermediate, 4 advanced)
              </p>
            </div>
            <ExamQuestionDialog
              onSave={(data) => handleSaveExamQuestion(data)}
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              }
            />
          </div>

          {/* Group by difficulty */}
          {["beginner", "intermediate", "advanced"].map((difficulty) => {
            const difficultyQuestions = examQuestions.filter(
              (q) => q.difficulty === difficulty
            );
            const difficultyColors = {
              beginner: "bg-green-500",
              intermediate: "bg-yellow-500",
              advanced: "bg-red-500",
            };
            const difficultyXP = {
              beginner: 10,
              intermediate: 25,
              advanced: 50,
            };

            return (
              <div key={difficulty} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${difficultyColors[difficulty]}`}
                  />
                  <h3 className="text-lg font-semibold capitalize">
                    {difficulty} ({difficultyQuestions.length}/4)
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {difficultyXP[difficulty]} XP each
                  </Badge>
                </div>

                <div className="grid gap-3 pl-6">
                  {difficultyQuestions.map((question, index) => (
                    <Card key={question.id}>
                      <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              <span className="text-sm font-medium">
                                {question.question_text}
                              </span>
                    </div>
                    <div className="flex gap-2">
                              {question.media_type && question.media_type !== "none" && (
                                <Badge variant="secondary" className="text-xs">
                                  {question.media_type}
                                </Badge>
                              )}
                              <Badge
                                className={`text-xs ${
                                  question.is_active
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {question.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ExamQuestionDialog
                              question={question}
                              onSave={(data) => handleSaveExamQuestion(data, true)}
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
                                handleDeleteExamQuestion(question.id)
                              }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div
                            className={
                              question.correct_answer === "A"
                                ? "text-green-600 font-medium"
                                : ""
                            }
                          >
                            A: {question.option_a}
                    </div>
                          <div
                            className={
                              question.correct_answer === "B"
                                ? "text-green-600 font-medium"
                                : ""
                            }
                          >
                            B: {question.option_b}
                    </div>
                          <div
                            className={
                              question.correct_answer === "C"
                                ? "text-green-600 font-medium"
                                : ""
                            }
                          >
                            C: {question.option_c}
                  </div>
                          <div
                            className={
                              question.correct_answer === "D"
                                ? "text-green-600 font-medium"
                                : ""
                            }
                          >
                            D: {question.option_d}
                          </div>
                        </div>
                        {question.explanation && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                </CardContent>
              </Card>
            ))}

                  {difficultyQuestions.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-lg">
                      No {difficulty} questions yet. Add some!
          </div>
                  )}
                </div>
              </div>
            );
          })}
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
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      <Badge>{new Date(event.date).toLocaleDateString()}</Badge>
                      <Badge variant="secondary">${event.price}</Badge>
                      <Badge variant="outline">
                        {event.spots_available} spots
                      </Badge>
                      <Badge variant="default">
                        {eventRegistrations[event.id]?.length || 0} registered
                      </Badge>
                    </div>
                    {eventRegistrations[event.id]?.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRegistrations(event)}
                        className="w-full"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Registrations (
                        {eventRegistrations[event.id].length})
                      </Button>
                    )}
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

      {/* Event Registrations Dialog */}
      {showRegistrationsDialog && selectedEvent && (
        <Dialog
          open={showRegistrationsDialog}
          onOpenChange={setShowRegistrationsDialog}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrations for {selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {eventRegistrations[selectedEvent.id]?.length || 0} users
                registered
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {eventRegistrations[selectedEvent.id]?.length > 0 ? (
                <div className="grid gap-3">
                  {eventRegistrations[selectedEvent.id].map((registration) => (
                    <Card key={registration.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {registration.profiles?.full_name ||
                                "Unknown User"}
                            </CardTitle>
                            <CardDescription>
                              {registration.profiles?.email}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              registration.status === "confirmed"
                                ? "default"
                                : registration.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {registration.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Registered:{" "}
                              {new Date(
                                registration.created_at
                              ).toLocaleString()}
                            </span>
                          </div>
                          {registration.notes && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-sm">{registration.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No registrations yet
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Question Dialog Component
function QuestionDialog({ question, lessonId: _lessonId, onSave, trigger }) {
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

          {formData.media_type === "image" && (
            <ImageUpload
              value={formData.media_url}
              onChange={(url) =>
                setFormData({ ...formData, media_url: url })
              }
              label="Question Image"
            />
          )}

          {formData.media_type === "video" && (
              <div>
              <Label htmlFor="media_url">Video URL</Label>
                <Input
                  id="media_url"
                  type="url"
                  value={formData.media_url}
                  onChange={(e) =>
                    setFormData({ ...formData, media_url: e.target.value })
                  }
                placeholder="https://www.youtube.com/watch?v=... or https://..."
                />
              <p className="text-xs text-gray-500 mt-1">
                Paste a YouTube URL or direct video link
              </p>
              </div>
            )}

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
function LessonDialog({ lesson, onSave, trigger, chapters }) {
  const [open, setOpen] = useState(false);
  const [isCreatingNewChapter, setIsCreatingNewChapter] = useState(false);
  const [formData, setFormData] = useState(
    lesson || {
      title: "",
      description: "",
      chapter: "",
      mode: "iq",
      difficulty: "beginner",
      level: 1,
      estimated_time: 10,
      xp_reward: 50,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Find chapter_id if chapter name is selected from existing chapters
    const dataToSave = { ...formData };
    if (dataToSave.chapter && !isCreatingNewChapter) {
      const selectedChapter = chapters.find(
        (ch) => ch.title === dataToSave.chapter && ch.mode === dataToSave.mode
      );
      if (selectedChapter) {
        dataToSave.chapter_id = selectedChapter.id;
      }
    }
    
    onSave(dataToSave);
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
            <Label htmlFor="mode">Mode</Label>
            <Select
              value={formData.mode}
              onValueChange={(value) =>
                setFormData({ ...formData, mode: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iq">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    IQ Mode
                  </div>
                </SelectItem>
                <SelectItem value="oncourt">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    On Court
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div>
            <Label htmlFor="chapter">Chapter</Label>
            <Select
              value={isCreatingNewChapter ? "_create_new_" : formData.chapter}
              onValueChange={(value) => {
                if (value === "_create_new_") {
                  setIsCreatingNewChapter(true);
                  setFormData({ ...formData, chapter: "" });
                } else {
                  setIsCreatingNewChapter(false);
                  setFormData({ ...formData, chapter: value });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters
                  .filter((ch) => ch.mode === formData.mode)
                  .map((ch) => (
                    <SelectItem key={ch.id} value={ch.title}>
                      {ch.title}
                    </SelectItem>
                  ))}
                <SelectItem value="_create_new_">
                  <div className="flex items-center gap-2 font-semibold text-blue-600">
                    <Plus className="w-4 h-4" />
                    Create New Chapter
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isCreatingNewChapter && (
              <Input
                className="mt-2"
                placeholder="Enter new chapter name"
                value={formData.chapter}
                onChange={(e) =>
                  setFormData({ ...formData, chapter: e.target.value })
                }
                required
              />
            )}
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

// Chapter Dialog Component
function ChapterDialog({ chapter, onSave, trigger, lessons }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    chapter || {
      title: "",
      description: "",
      mode: "iq",
      order_index: 1,
      is_active: true,
    }
  );
  const [selectedLessons, setSelectedLessons] = useState(
    chapter
      ? lessons.filter((l) => l.chapter_id === chapter.id).map((l) => l.id)
      : []
  );
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Filter lessons by mode
  const availableLessons = lessons.filter((l) => l.mode === formData.mode);

  // Calculate total XP
  const totalXP = selectedLessons.reduce((sum, lessonId) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    return sum + (lesson?.xp_reward || 0);
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, selectedLessons });
    setOpen(false);
  };

  const toggleLesson = (lessonId) => {
    setSelectedLessons((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newLessons = [...selectedLessons];
    const draggedLesson = newLessons[draggedIndex];
    newLessons.splice(draggedIndex, 1);
    newLessons.splice(index, 0, draggedLesson);

    setSelectedLessons(newLessons);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {chapter ? "Edit Chapter" : "Create New Chapter"}
          </DialogTitle>
          <DialogDescription>
            {chapter
              ? "Update chapter details and manage lessons"
              : "Add a new chapter to organize lessons"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="chapter-title">Title *</Label>
            <Input
              id="chapter-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              placeholder="e.g., Fundamentals, Defense, Offense"
            />
          </div>

          <div>
            <Label htmlFor="chapter-description">Description</Label>
            <Textarea
              id="chapter-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              placeholder="Brief description of what this chapter covers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
          <div>
              <Label htmlFor="chapter-mode">Mode</Label>
              <Select
                value={formData.mode}
                onValueChange={(value) => {
                  setFormData({ ...formData, mode: value });
                  setSelectedLessons([]); // Clear lessons when mode changes
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iq">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      IQ Mode
          </div>
                  </SelectItem>
                  <SelectItem value="oncourt">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" />
                      On Court
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div>
              <Label htmlFor="chapter-order">Order Index</Label>
              <Input
                id="chapter-order"
                type="number"
                value={formData.order_index}
              onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_index: parseInt(e.target.value) || 1,
                  })
              }
                min="1"
            />
          </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="chapter-active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="chapter-active">Active Chapter</Label>
          </div>

          {/* Lesson Selection */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <Label>Lessons in this Chapter</Label>
              <Badge variant="secondary">
                Total XP: {totalXP}
              </Badge>
            </div>

            {availableLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No lessons available for {formData.mode === "iq" ? "IQ Mode" : "On Court"}. Create lessons first.
              </p>
            ) : (
              <>
                {/* Available Lessons */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Available Lessons:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {availableLessons
                      .filter((lesson) => !selectedLessons.includes(lesson.id))
                      .map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleLesson(lesson.id)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.xp_reward} XP
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLesson(lesson.id);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Selected Lessons (Draggable) */}
                {selectedLessons.length > 0 && (
          <div>
                    <p className="text-sm font-medium mb-2">
                      Selected Lessons ({selectedLessons.length}):
                    </p>
                    <div className="space-y-2 border rounded-lg p-2 bg-blue-50">
                      {selectedLessons.map((lessonId, index) => {
                        const lesson = lessons.find((l) => l.id === lessonId);
                        if (!lesson) return null;

                        return (
                          <div
                            key={lessonId}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between p-2 bg-white rounded border-2 cursor-move ${
                              draggedIndex === index
                                ? "border-blue-500 opacity-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-gray-400">☰</span>
                              <div>
                                <p className="font-medium text-sm">
                                  {index + 1}. {lesson.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.xp_reward} XP
                                </p>
          </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleLesson(lessonId)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Drag to reorder lessons
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {chapter ? "Update" : "Create"} Chapter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Exam Question Dialog Component
function ExamQuestionDialog({ question, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(
    question || {
      question_text: "",
      difficulty: "beginner",
      media_type: null,
      media_url: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      explanation: "",
      order_index: 0,
      is_active: true,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(question ? { ...formData, id: question.id } : formData);
    setOpen(false);
    if (!question) {
      setFormData({
        question_text: "",
        difficulty: "beginner",
        media_type: null,
        media_url: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
        order_index: 0,
        is_active: true,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Edit" : "Add"} Exam Question
          </DialogTitle>
          <DialogDescription>
            Add a question for the entry assessment exam.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty *</Label>
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
                  <SelectItem value="beginner">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Beginner (10 XP)
                    </span>
                  </SelectItem>
                  <SelectItem value="intermediate">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Intermediate (25 XP)
                    </span>
                  </SelectItem>
                  <SelectItem value="advanced">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Advanced (50 XP)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
          </div>

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
              placeholder="Enter the question..."
            />
          </div>

          <div>
            <Label htmlFor="media_type">Media Type</Label>
              <Select
              value={formData.media_type || "none"}
                onValueChange={(value) =>
                setFormData({
                  ...formData,
                  media_type: value === "none" ? null : value,
                })
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

          {formData.media_type === "image" && (
            <ImageUpload
              value={formData.media_url}
              onChange={(url) => setFormData({ ...formData, media_url: url })}
            />
          )}

          {formData.media_type === "video" && (
            <div>
              <Label htmlFor="media_url">Video URL</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="option_a">Option A *</Label>
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
              <Label htmlFor="option_b">Option B *</Label>
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
              <Label htmlFor="option_c">Option C *</Label>
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
              <Label htmlFor="option_d">Option D *</Label>
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
            <Label htmlFor="explanation">Explanation (shown after answering)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation || ""}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              rows={2}
              placeholder="Explain why this answer is correct..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="is_active">Active (shown in exams)</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {question ? "Update" : "Create"} Question
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
