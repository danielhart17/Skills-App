import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Challenge, ChallengeRating, ChallengeProgress } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Clock,
  Users,
  Target,
  Star,
  CheckCircle,
  Play,
  MapPin,
  Wrench,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}


export default function ChallengeDetail() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [completionCount, setCompletionCount] = useState(0);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    review: "",
  });
  const [completionForm, setCompletionForm] = useState({
    timeSpent: 0,
    notes: "",
  });

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    try {
      const [challengeData, progressData, ratingData, countResult] =
        await Promise.all([
          Challenge.get(challengeId),
          ChallengeProgress.getUserProgress(challengeId),
          ChallengeRating.getUserRating(challengeId),
          supabase.rpc("get_challenge_completion_count", {
            p_challenge_id: challengeId,
          }),
        ]);

      setChallenge(challengeData);
      setIsCompleted(progressData?.is_completed || false);
      setUserRating(ratingData);
      if (countResult.error) {
        console.warn("Completion count unavailable:", countResult.error);
        setCompletionCount(0);
      } else {
        setCompletionCount(countResult.data ?? 0);
      }

      // Get all ratings to calculate average
      const allRatings = await ChallengeRating.getByChallenge(challengeId);
      if (allRatings && allRatings.length > 0) {
        const avg =
          allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        setAverageRating(avg);
        setRatingCount(allRatings.length);
      }

      if (ratingData) {
        setRatingForm({
          rating: ratingData.rating,
          review: ratingData.review || "",
        });
      }

      if (progressData) {
        setCompletionForm({
          timeSpent: Math.floor(progressData.time_spent_seconds / 60) || 0,
          notes: progressData.notes || "",
        });
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      toast.error("Failed to load challenge");
    }
    setIsLoading(false);
  };

  const handleStartChallenge = () => {
    // For now, just mark as started - could add more complex tracking later
    toast.success("Workout started! Good luck!");
  };

  const handleMarkComplete = async () => {
    try {
      await ChallengeProgress.markComplete(
        challengeId,
        completionForm.timeSpent * 60, // Convert minutes to seconds
        completionForm.notes
      );
      setIsCompleted(true);
      setCompletionCount((prev) => prev + (isCompleted ? 0 : 1));
      toast.success("Workout marked as complete! Great job!");
    } catch (error) {
      console.error("Error marking challenge complete:", error);
      toast.error("Failed to mark challenge as complete");
    }
  };

  const handleSubmitRating = async () => {
    try {
      await ChallengeRating.create({
        challenge_id: challengeId,
        rating: ratingForm.rating,
        review: ratingForm.review,
      });

      // Reload ratings
      const allRatings = await ChallengeRating.getByChallenge(challengeId);
      if (allRatings && allRatings.length > 0) {
        const avg =
          allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        setAverageRating(avg);
        setRatingCount(allRatings.length);
      }

      setUserRating({ rating: ratingForm.rating, review: ratingForm.review });
      setShowRatingForm(false);
      toast.success("Rating submitted successfully!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "shooting":
        return "🏀";
      case "dribbling":
        return "⚡";
      case "defense":
        return "🛡️";
      case "passing":
        return "📤";
      case "conditioning":
        return "💪";
      case "footwork":
        return "👟";
      case "rebounding":
        return "⬆️";
      default:
        return "🎯";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Workout not found</h1>
          <Button onClick={() => navigate("/workouts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workouts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/workouts")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workouts
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>
            <p className="text-muted-foreground text-lg">
              {challenge.description}
            </p>
          </div>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        {/* Challenge Meta */}
        <div className="flex gap-2 flex-wrap mt-4">
          <Badge className={getDifficultyColor(challenge.difficulty)}>
            {challenge.difficulty}
          </Badge>
          <Badge variant="outline">
            {getCategoryIcon(challenge.category)} {challenge.category}
          </Badge>
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {challenge.duration_minutes} min
          </Badge>
          {challenge.xp_reward && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800"
            >
              <Trophy className="w-3 h-3 mr-1" />
              {challenge.xp_reward} XP
            </Badge>
          )}
          {challenge.players_needed && (
            <Badge variant="secondary">
              <Users className="w-3 h-3 mr-1" />
              {challenge.players_needed} player
              {challenge.players_needed > 1 ? "s" : ""}
            </Badge>
          )}
          {challenge.space_required && (
            <Badge variant="secondary">
              <MapPin className="w-3 h-3 mr-1" />
              {challenge.space_required}
            </Badge>
          )}
          <Badge variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            {completionCount} completed
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demo Video */}
          {challenge.youtube_url && getYouTubeId(challenge.youtube_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Demo Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-black"
                  style={{ paddingBottom: "56.25%", height: 0 }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(
                      challenge.youtube_url
                    )}?rel=0&modestbranding=1`}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={`${challenge.title} demo video`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purpose */}
          {challenge.purpose && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{challenge.purpose}</p>
              </CardContent>
            </Card>
          )}

          {/* Setup */}
          {challenge.setup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {challenge.setup}
                </p>
              </CardContent>
            </Card>
          )}

       {/* Instructions */}
       {challenge.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground whitespace-pre-line">
                  {challenge.instructions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Focus */}
          {challenge.focus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Focus Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{challenge.focus}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold">{completionCount}</p>
                <p className="text-sm text-muted-foreground">
                  athlete{completionCount === 1 ? "" : "s"} completed this
                  workout
                </p>
              </div>

              {!isCompleted ? (
                <>
                  <Button onClick={handleStartChallenge} className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Start Workout
                  </Button>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="time-spent">Time Spent (minutes)</Label>
                      <Input
                        id="time-spent"
                        type="number"
                        value={completionForm.timeSpent}
                        onChange={(e) =>
                          setCompletionForm({
                            ...completionForm,
                            timeSpent: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={completionForm.notes}
                        onChange={(e) =>
                          setCompletionForm({
                            ...completionForm,
                            notes: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="How did it go? Any tips for next time?"
                      />
                    </div>
                    <Button
                      onClick={handleMarkComplete}
                      className="w-full"
                      variant="outline"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-semibold">
                    Workout Completed!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Great job! You spent {completionForm.timeSpent} minutes on
                    this workout.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= averageRating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {ratingCount} rating{ratingCount !== 1 ? "s" : ""}
                </p>
              </div>

              {userRating ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Your Rating:</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= userRating.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {userRating.review && (
                    <p className="text-sm text-muted-foreground">
                      "{userRating.review}"
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatingForm(true)}
                    className="w-full"
                  >
                    Update Rating
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowRatingForm(true)}
                  className="w-full"
                >
                  Rate This Workout
                </Button>
              )}

              {showRatingForm && (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setRatingForm({ ...ratingForm, rating: star })
                          }
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= ratingForm.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="review">Review (optional)</Label>
                    <Textarea
                      id="review"
                      value={ratingForm.review}
                      onChange={(e) =>
                        setRatingForm({ ...ratingForm, review: e.target.value })
                      }
                      rows={3}
                      placeholder="Share your experience with this workout..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitRating}
                      className="flex-1"
                    >
                      Submit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRatingForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
