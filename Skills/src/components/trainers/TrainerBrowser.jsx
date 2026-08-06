import { useState, useEffect, useCallback } from "react";
import { Trainer } from "@/api/entities";
import { TrainingEvent } from "@/api/entities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  Star,
  Calendar,
  DollarSign,
  CheckCircle,
  Play,
  Filter,
  Search,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchFollowedTrainerUserIds,
  followTrainer,
  unfollowTrainer,
  getTrainerAuthUserId,
} from "@/api/followService";
import { toast } from "sonner";

function getSpecializationColor(specialization) {
  const colors = {
    Shooting: "bg-red-100 text-red-800",
    "Ball Handling": "bg-blue-100 text-blue-800",
    Defense: "bg-green-100 text-green-800",
    "Post Play": "bg-purple-100 text-purple-800",
    Footwork: "bg-yellow-100 text-yellow-800",
    Conditioning: "bg-orange-100 text-orange-800",
    "Youth Development": "bg-pink-100 text-pink-800",
    "Advanced Skills": "bg-indigo-100 text-indigo-800",
  };
  return colors[specialization] || "bg-gray-100 text-gray-800";
}

/**
 * Browse/filter verified trainers and upcoming training sessions.
 * @param {{ showHeader?: boolean, profileReturnTo?: string }} props
 */
export default function TrainerBrowser({
  showHeader = true,
  profileReturnTo,
} = {}) {
  const { user, isAthlete } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [listFilter, setListFilter] = useState("all"); // all | following
  const [zipCodeFilter, setZipCodeFilter] = useState("");
  const [followedUserIds, setFollowedUserIds] = useState(new Set());
  const [followBusyId, setFollowBusyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFollows = useCallback(async () => {
    if (!user?.id || !isAthlete?.()) {
      setFollowedUserIds(new Set());
      return;
    }
    try {
      const ids = await fetchFollowedTrainerUserIds(user.id);
      setFollowedUserIds(new Set(ids));
    } catch (error) {
      console.warn("Could not load followed trainers:", error);
    }
  }, [user?.id, isAthlete]);

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    loadFollows();
  }, [loadFollows]);

  const loadTrainers = async () => {
    try {
      const [allTrainers, allEvents] = await Promise.all([
        Trainer.list(),
        TrainingEvent.list(),
      ]);
      setTrainers(allTrainers);
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading trainers:", error);
    }
    setIsLoading(false);
  };

  const getSpecializations = () => {
    const specializations = new Set();
    trainers.forEach((trainer) => {
      trainer.specializations?.forEach((spec) => specializations.add(spec));
    });
    return Array.from(specializations);
  };

  const filteredTrainers = trainers.filter((trainer) => {
    const authId = getTrainerAuthUserId(trainer);
    const followingMatch =
      listFilter !== "following" ||
      (authId && followedUserIds.has(authId));

    const specializationMatch =
      selectedSpecialization === "all" ||
      trainer.specializations?.includes(selectedSpecialization);

    const zipCodeMatch =
      !zipCodeFilter ||
      trainer.location?.toLowerCase().includes(zipCodeFilter.toLowerCase());

    return followingMatch && specializationMatch && zipCodeMatch;
  });

  const getTrainerEvents = (trainerId) => {
    return events.filter((event) => event.trainer_id === trainerId);
  };

  const profileHref = (trainerId) => {
    const base = `/trainerprofile?id=${trainerId}`;
    if (!profileReturnTo) return base;
    return `${base}&returnTo=${encodeURIComponent(profileReturnTo)}`;
  };

  const handleToggleFollow = async (trainer) => {
    const trainerUserId = getTrainerAuthUserId(trainer);
    if (!trainerUserId) {
      toast.error("This trainer profile isn't ready to follow yet.");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in as an athlete to follow trainers.");
      return;
    }

    const currentlyFollowing = followedUserIds.has(trainerUserId);
    setFollowBusyId(trainer.id);
    try {
      if (currentlyFollowing) {
        await unfollowTrainer(trainerUserId);
        setFollowedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(trainerUserId);
          return next;
        });
        toast.success(`Unfollowed ${trainer.name}`);
      } else {
        await followTrainer(trainerUserId);
        setFollowedUserIds((prev) => new Set(prev).add(trainerUserId));
        toast.success(
          `Following ${trainer.name}. You'll be notified when they post workouts.`
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.message ||
          "Couldn't update follow. Run add_athlete_follow_trainers.sql in Supabase, then try again."
      );
    } finally {
      setFollowBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-700/60 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 bg-gray-700/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Verified Trainers
            </h1>
          </div>
          <p className="text-xl text-brand-lightGray max-w-2xl mx-auto">
            Follow trainers to book faster and get notified about new workouts
          </p>
        </div>
      )}

      <div className="space-y-4">
        {isAthlete?.() && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={listFilter === "all" ? "default" : "outline"}
              onClick={() => setListFilter("all")}
              size="sm"
              className={
                listFilter === "all"
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : ""
              }
            >
              All Trainers
            </Button>
            <Button
              variant={listFilter === "following" ? "default" : "outline"}
              onClick={() => setListFilter("following")}
              size="sm"
              className={
                listFilter === "following"
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : ""
              }
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              My Trainers
              {followedUserIds.size > 0 ? ` (${followedUserIds.size})` : ""}
            </Button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">
              Find trainers near you:
            </span>
          </div>
          <div className="relative">
            <Input
              placeholder="Enter zip code or city..."
              value={zipCodeFilter}
              onChange={(e) => setZipCodeFilter(e.target.value)}
              className="w-64 pl-10"
            />
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          {zipCodeFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZipCodeFilter("")}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">
              Specialization:
            </span>
          </div>
          <Button
            variant={selectedSpecialization === "all" ? "default" : "outline"}
            onClick={() => setSelectedSpecialization("all")}
            size="sm"
            className={
              selectedSpecialization === "all"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                : ""
            }
          >
            All Specs
          </Button>
          {getSpecializations().map((specialization) => (
            <Button
              key={specialization}
              variant={
                selectedSpecialization === specialization ? "default" : "outline"
              }
              onClick={() => setSelectedSpecialization(specialization)}
              size="sm"
              className={
                selectedSpecialization === specialization
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                  : ""
              }
            >
              {specialization}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400">
          {filteredTrainers.length} trainer
          {filteredTrainers.length !== 1 ? "s" : ""} found
          {listFilter === "following" && " in My Trainers"}
          {zipCodeFilter && ` near "${zipCodeFilter}"`}
          {selectedSpecialization !== "all" &&
            ` specializing in ${selectedSpecialization}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainers.map((trainer) => {
          const trainerUserId = getTrainerAuthUserId(trainer);
          const following = trainerUserId
            ? followedUserIds.has(trainerUserId)
            : false;
          const busy = followBusyId === trainer.id;

          return (
            <Card
              key={trainer.id}
              className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={trainer.profile_image} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                        {trainer.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "T"}
                      </AvatarFallback>
                    </Avatar>
                    {trainer.verified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                      {trainer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      {trainer.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      {trainer.years_experience} years experience
                    </div>
                    {following && (
                      <Badge className="mt-2 bg-brand-orange/20 text-brand-orange border-0">
                        Following
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {trainer.bio}
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      Specializations:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.specializations
                        ?.slice(0, 3)
                        .map((specialization, index) => (
                          <Badge
                            key={index}
                            className={`text-xs ${getSpecializationColor(
                              specialization
                            )}`}
                          >
                            {specialization}
                          </Badge>
                        ))}
                      {trainer.specializations?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{trainer.specializations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {trainer.hourly_rate && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">
                        ${trainer.hourly_rate}/hour
                      </span>
                    </div>
                  )}

                  {getTrainerEvents(trainer.id).length > 0 && (
                    <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">
                          Upcoming Events
                        </span>
                      </div>
                      <p className="text-xs text-blue-400">
                        {getTrainerEvents(trainer.id).length} training sessions
                        available
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={profileHref(trainer.id)} className="flex-1">
                      <Button className="w-full bg-brand-blue hover:opacity-90 text-white">
                        View Profile
                      </Button>
                    </Link>
                    {isAthlete?.() && (
                      <Button
                        type="button"
                        variant={following ? "outline" : "default"}
                        className={
                          following
                            ? "shrink-0 border-brand-orange/50 text-brand-orange"
                            : "shrink-0 bg-brand-orange hover:opacity-90 text-white"
                        }
                        disabled={busy || !trainerUserId}
                        onClick={() => handleToggleFollow(trainer)}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : following ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                    {trainer.training_videos?.length > 0 && (
                      <Button size="icon" variant="outline" className="shrink-0">
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTrainers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {listFilter === "following"
              ? "No Followed Trainers Yet"
              : "No Trainers Found"}
          </h3>
          <p className="text-gray-400 mb-6">
            {listFilter === "following"
              ? "Follow trainers from All Trainers to build your list for quicker booking."
              : zipCodeFilter
                ? `No trainers found near "${zipCodeFilter}"${
                    selectedSpecialization !== "all"
                      ? ` specializing in ${selectedSpecialization}`
                      : ""
                  }`
                : selectedSpecialization === "all"
                  ? "No verified trainers available yet"
                  : `No trainers found for ${selectedSpecialization}`}
          </p>
          <div className="flex gap-3 justify-center">
            {listFilter === "following" && (
              <Button
                onClick={() => setListFilter("all")}
                className="bg-gradient-to-r from-orange-500 to-red-500"
              >
                Browse All Trainers
              </Button>
            )}
            {zipCodeFilter && (
              <Button
                onClick={() => setZipCodeFilter("")}
                className="bg-gradient-to-r from-blue-500 to-indigo-600"
              >
                Clear Location Filter
              </Button>
            )}
            <Button
              onClick={() => {
                setSelectedSpecialization("all");
                setZipCodeFilter("");
                setListFilter("all");
              }}
              variant={zipCodeFilter || listFilter === "following" ? "outline" : "default"}
              className={
                !zipCodeFilter && listFilter !== "following"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                  : ""
              }
            >
              View All Trainers
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
