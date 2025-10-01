
import React, { useState, useEffect } from "react";
import { Trainer } from "@/api/entities";
import { TrainingEvent } from "@/api/entities"; // Corrected import path for TrainingEvent
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Added Input import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  MapPin, 
  Star, 
  Calendar, 
  DollarSign,
  CheckCircle,
  Play,
  Filter,
  Search // Added Search icon import
} from "lucide-react";

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [zipCodeFilter, setZipCodeFilter] = useState(""); // Added zipCodeFilter state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    try {
      // Changed to Promise.all for concurrent loading
      const [allTrainers, allEvents] = await Promise.all([
        Trainer.list(),
        TrainingEvent.list()
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
    trainers.forEach(trainer => {
      trainer.specializations?.forEach(spec => specializations.add(spec));
    });
    return Array.from(specializations);
  };

  // Modified filteredTrainers to include zipCodeFilter
  const filteredTrainers = trainers.filter(trainer => {
    const specializationMatch = selectedSpecialization === "all" || 
      trainer.specializations?.includes(selectedSpecialization);
    
    // Check if trainer.location contains the zipCodeFilter (case-insensitive)
    // The outline also includes `trainer.location?.includes(zipCodeFilter)` for exact match or general location string
    const zipCodeMatch = !zipCodeFilter || 
      trainer.location?.toLowerCase().includes(zipCodeFilter.toLowerCase());
    
    return specializationMatch && zipCodeMatch;
  });

  const getTrainerEvents = (trainerId) => {
    return events.filter(event => event.trainer_id === trainerId);
  };

  const getSpecializationColor = (specialization) => {
    const colors = {
      'Shooting': 'bg-red-100 text-red-800',
      'Ball Handling': 'bg-blue-100 text-blue-800',
      'Defense': 'bg-green-100 text-green-800',
      'Post Play': 'bg-purple-100 text-purple-800',
      'Footwork': 'bg-yellow-100 text-yellow-800',
      'Conditioning': 'bg-orange-100 text-orange-800',
      'Youth Development': 'bg-pink-100 text-pink-800',
      'Advanced Skills': 'bg-indigo-100 text-indigo-800'
    };
    return colors[specialization] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Verified Trainers</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with professional basketball trainers in your area
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Location Filter */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Find trainers near you:</span>
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

          {/* Specialization Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Specialization:</span>
            </div>
            <Button
              variant={selectedSpecialization === "all" ? "default" : "outline"}
              onClick={() => setSelectedSpecialization("all")}
              size="sm"
              className={selectedSpecialization === "all" ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
            >
              All Trainers
            </Button>
            {getSpecializations().map((specialization) => (
              <Button
                key={specialization}
                variant={selectedSpecialization === specialization ? "default" : "outline"}
                onClick={() => setSelectedSpecialization(specialization)}
                size="sm"
                className={selectedSpecialization === specialization ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
              >
                {specialization}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="text-center">
          <p className="text-gray-600">
            {filteredTrainers.length} trainer{filteredTrainers.length !== 1 ? 's' : ''} found
            {zipCodeFilter && ` near "${zipCodeFilter}"`}
            {selectedSpecialization !== "all" && ` specializing in ${selectedSpecialization}`}
          </p>
        </div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrainers.map((trainer) => (
            <Card key={trainer.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={trainer.profile_image} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                        {trainer.name?.split(' ').map(n => n[0]).join('') || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    {trainer.verified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                      {trainer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      {trainer.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      {trainer.years_experience} years experience
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {trainer.bio}
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Specializations:</p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.specializations?.slice(0, 3).map((specialization, index) => (
                        <Badge key={index} className={`text-xs ${getSpecializationColor(specialization)}`}>
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
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">${trainer.hourly_rate}/hour</span>
                    </div>
                  )}

                  {/* Upcoming Events */}
                  {getTrainerEvents(trainer.id).length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Upcoming Events</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        {getTrainerEvents(trainer.id).length} training sessions available
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={createPageUrl(`TrainerProfile?id=${trainer.id}`)} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                        View Profile
                      </Button>
                    </Link>
                    {trainer.training_videos?.length > 0 && (
                      <Button size="icon" variant="outline" className="shrink-0">
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTrainers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trainers Found</h3>
            <p className="text-gray-600 mb-6">
              {zipCodeFilter 
                ? `No trainers found near "${zipCodeFilter}"${selectedSpecialization !== "all" ? ` specializing in ${selectedSpecialization}` : ''}`
                : selectedSpecialization === "all" 
                  ? "No verified trainers available yet"
                  : `No trainers found for ${selectedSpecialization}`
              }
            </p>
            <div className="flex gap-3 justify-center">
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
                }}
                variant={zipCodeFilter ? "outline" : "default"} // Use outline variant if zipCodeFilter is active
                className={!zipCodeFilter ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
              >
                View All Trainers
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
