import React, { useState, useEffect } from "react";
import { Lesson } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Lock, 
  CheckCircle, 
  Clock, 
  Star,
  Play,
  Book,
  Target
} from "lucide-react";

export default function IQMode() {
  const [lessons, setLessons] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const allLessons = await Lesson.list();
      const iqLessons = allLessons.filter(lesson => lesson.mode === 'iq');
      setLessons(iqLessons);
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
    setIsLoading(false);
  };

  const getChapters = () => {
    const chapters = [...new Set(lessons.map(lesson => lesson.chapter))];
    return chapters.filter(chapter => chapter);
  };

  const filteredLessons = selectedChapter === "all" 
    ? lessons 
    : lessons.filter(lesson => lesson.chapter === selectedChapter);

  const groupedLessons = filteredLessons.reduce((acc, lesson) => {
    const chapter = lesson.chapter || "Other";
    if (!acc[chapter]) acc[chapter] = [];
    acc[chapter].push(lesson);
    return acc;
  }, {});

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
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
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Basketball IQ Mode</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Master the mental game with strategic knowledge, rules, and basketball theory
          </p>
        </div>

        {/* Chapter Filter */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant={selectedChapter === "all" ? "default" : "outline"}
            onClick={() => setSelectedChapter("all")}
            className={selectedChapter === "all" ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
          >
            All Chapters
          </Button>
          {getChapters().map((chapter) => (
            <Button
              key={chapter}
              variant={selectedChapter === chapter ? "default" : "outline"}
              onClick={() => setSelectedChapter(chapter)}
              className={selectedChapter === chapter ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
            >
              {chapter}
            </Button>
          ))}
        </div>

        {/* Lessons by Chapter */}
        {Object.entries(groupedLessons).map(([chapter, chapterLessons]) => (
          <div key={chapter} className="space-y-6">
            <div className="flex items-center gap-3">
              <Book className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">{chapter}</h2>
              <Badge variant="outline" className="ml-2">
                {chapterLessons.length} lessons
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chapterLessons.map((lesson) => (
                <Card key={lesson.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {lesson.title}
                        </CardTitle>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {lesson.level <= 5 ? (
                          <Play className="w-5 h-5 text-green-500" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className={getDifficultyColor(lesson.difficulty)}>
                          {lesson.difficulty}
                        </Badge>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {lesson.estimated_time || 10}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            +{lesson.xp_reward}XP
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Level {lesson.level} Required</span>
                          <span className="text-gray-500">0/5 completed</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>

                      <Button 
                        className={`w-full transition-all duration-200 ${
                          lesson.level <= 5 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={lesson.level > 5}
                      >
                        {lesson.level <= 5 ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Lesson
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Locked
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {lessons.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No IQ Lessons Yet</h3>
            <p className="text-gray-600 mb-6">Basketball theory lessons are coming soon!</p>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Target className="w-4 h-4 mr-2" />
              Request Content
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}