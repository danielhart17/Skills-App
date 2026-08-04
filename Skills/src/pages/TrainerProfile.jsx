import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Trainer } from "@/api/entities";
import { TrainingEvent } from "@/api/entities";
import { Review } from "@/api/entities";
import { TrainerService } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Star,
  Calendar,
  CheckCircle,
  Play,
  Award,
  BookOpen,
  MessageSquare,
  Sparkles,
  Images,
  Video,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

// Helper to extract YouTube video ID
const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const StarRating = ({ rating, count }) => (
  <div className="flex items-center gap-2">
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < Math.floor(rating)
              ? "text-yellow-400 fill-current"
              : "text-gray-600"
          }`}
        />
      ))}
    </div>
    <span className="text-gray-300 text-sm font-medium">
      {rating.toFixed(1)} ({count} reviews)
    </span>
  </div>
);

export default function TrainerProfile() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get("returnTo");
  const [trainer, setTrainer] = useState(null);
  const [events, setEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const bookingHref = (trainerId, serviceId) => {
    const params = new URLSearchParams({ trainerId });
    if (serviceId) params.set("serviceId", serviceId);
    if (returnTo) params.set("returnTo", returnTo);
    return `/booking?${params.toString()}`;
  };

  useEffect(() => {
    const trainerId = searchParams.get("id");
    if (trainerId) {
      loadTrainerData(trainerId);
    }
  }, [location]);

  const loadTrainerData = async (trainerId) => {
    setIsLoading(true);
    try {
      const [trainerData, eventsData, reviewsData, servicesData] =
        await Promise.all([
          Trainer.get(trainerId),
          TrainingEvent.filter({ trainer_id: trainerId }),
          Review.filter({ trainer_id: trainerId }),
          TrainerService.filter({ trainer_id: trainerId }),
        ]);
      setTrainer(trainerData);
      setEvents(eventsData);
      setReviews(reviewsData);
      setServices(servicesData);
    } catch (error) {
      console.error("Error loading trainer profile:", error);
    }
    setIsLoading(false);
  };

  const getSpecializationColor = (specialization) => {
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
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-white">
        Loading trainer profile...
      </div>
    );
  }

  if (!trainer) {
    return <div className="p-8 text-center text-white">Trainer not found.</div>;
  }

  return (
    <div className="p-6 lg:p-8 bg-brand-charcoal min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card className="border-0 shadow-xl bg-card">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                  <AvatarImage src={trainer.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-3xl">
                    {trainer.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "T"}
                  </AvatarFallback>
                </Avatar>
                {trainer.verified && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {trainer.name}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-300 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{trainer.location}</span>
                </div>
                <StarRating
                  rating={trainer.average_rating || 4.5}
                  count={trainer.review_count || reviews.length}
                />
                <p className="text-gray-300 mt-4 text-center md:text-left max-w-lg">
                  {trainer.bio?.substring(0, 150)}
                  {trainer.bio?.length > 150 && "..."}
                </p>
                <div className="mt-6 flex justify-center md:justify-start gap-3">
                  <Link to={bookingHref(trainer.id)}>
                    <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book a Session
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Watch Training
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (About, Certifications) */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  About {trainer.name.split(" ")[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>{trainer.bio}</p>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span>Experience</span>
                  <span className="font-semibold text-white">
                    {trainer.years_experience} years
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span>Hourly Rate</span>
                  <span className="font-semibold text-white">
                    ${trainer.hourly_rate}/hr
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Award className="w-5 h-5 text-green-400" />
                  Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trainer.certifications && trainer.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {trainer.certifications.map((cert, i) => (
                      <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="font-medium text-white">
                          {typeof cert === "string" ? cert : cert.name}
                        </div>
                        {typeof cert === "object" && (
                          <div className="text-sm text-gray-400 mt-1">
                            {cert.issuer} {cert.year && `• ${cert.year}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No certifications listed</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Services, Specializations, Events, Reviews) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  Training Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.length > 0 ? (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 bg-brand-gray rounded-lg border border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">
                            {service.name}
                          </h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {service.description}
                          </p>
                        </div>
                        <Link to={bookingHref(trainer.id, service.id)}>
                          <Button size="sm" variant="outline" className="ml-4">
                            Book
                          </Button>
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-3 pt-3 border-t border-gray-700">
                        <span className="font-bold text-blue-400">
                          ${service.price}
                        </span>
                        <span className="text-gray-400">
                          {service.duration_minutes} min
                        </span>
                        <Badge variant="secondary">{service.type}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">
                    No specific services listed. Contact trainer for details.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Specializations
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {trainer.specializations?.map((spec, i) => (
                  <Badge
                    key={i}
                    className={`px-3 py-1 text-sm ${getSpecializationColor(
                      spec
                    )}`}
                  >
                    {spec}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {/* Gallery Section */}
            {trainer.gallery && trainer.gallery.length > 0 && (
              <Card className="border-0 shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Images className="w-5 h-5 text-pink-400" />
                    Training Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {trainer.gallery.slice(0, 6).map((item, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group">
                            {item.type === "image" ? (
                              <img
                                src={item.url}
                                alt={item.caption || "Gallery image"}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
                                  <Video className="w-8 h-8 text-gray-500" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
                          <div className="relative">
                            {item.type === "image" ? (
                              <img
                                src={item.url}
                                alt={item.caption || "Gallery image"}
                                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                              />
                            ) : (
                              <div className="aspect-video w-full">
                                {item.url.includes("youtube") || item.url.includes("youtu.be") ? (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${getYouTubeId(item.url)}`}
                                    title={item.caption || "Video"}
                                    className="w-full h-full rounded-lg"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video
                                    src={item.url}
                                    controls
                                    className="w-full h-full rounded-lg"
                                  />
                                )}
                              </div>
                            )}
                            {item.caption && (
                              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                                <p className="text-white text-sm">{item.caption}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                  {trainer.gallery.length > 6 && (
                    <p className="text-center text-sm text-gray-400 mt-3">
                      +{trainer.gallery.length - 6} more items
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {events.length > 0 && (
              <Card className="border-0 shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calendar className="w-5 h-5 text-red-400" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 bg-brand-gray rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-white">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-300">
                          {format(new Date(event.date), "MMMM d, yyyy")} -{" "}
                          {event.location}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  Reviews ({reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex gap-4 border-b border-gray-700 pb-4 last:border-b-0 last:pb-0"
                  >
                    <Avatar>
                      <AvatarImage src={review.user_avatar} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {review.user_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {review.user_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(review.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <StarRating rating={review.rating} count={0} />
                      <p className="text-gray-300 mt-2">{review.comment}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Button className="w-full bg-brand-orange hover:opacity-90 text-white">
                    Leave a Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
