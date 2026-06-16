import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";

const INTENSITIES = ["Low", "Medium", "High"];

export default function WorkoutBuilder({ onSend, sending, athleteName }) {
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(tomorrow);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [intensity, setIntensity] = useState("Medium");
  const [trainerNotes, setTrainerNotes] = useState("");
  const [drills, setDrills] = useState([{ name: "", sets: "", notes: "" }]);

  const updateDrill = (index, field, value) => {
    setDrills((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const addDrill = () => {
    setDrills((prev) => [...prev, { name: "", sets: "", notes: "" }]);
  };

  const removeDrill = (index) => {
    if (drills.length <= 1) return;
    setDrills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const validDrills = drills.filter((d) => d.name.trim() && d.sets.trim());
    if (!title.trim() || validDrills.length === 0) return;

    onSend({
      title: title.trim(),
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      intensity,
      drills: validDrills.map((d) => ({
        name: d.name.trim(),
        sets: d.sets.trim(),
        notes: d.notes?.trim() || "",
      })),
      trainer_notes: trainerNotes.trim(),
    });
  };

  const canSend =
    title.trim() && drills.some((d) => d.name.trim() && d.sets.trim());

  return (
    <div className="space-y-3 p-3 rounded-xl bg-brand-charcoal border border-brand-gray/30 max-h-[50vh] overflow-y-auto">
      <p className="text-sm text-brand-lightGray">
        Building workout for {athleteName || "athlete"}
      </p>
      <div className="space-y-2">
        <Label className="text-brand-lightGray text-xs">Workout Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-brand-black border-brand-gray/30 text-brand-white"
          placeholder="e.g. Ball Handling Session"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-brand-lightGray text-xs">Date</Label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="bg-brand-black border-brand-gray/30 text-brand-white"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-brand-lightGray text-xs">Time</Label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="bg-brand-black border-brand-gray/30 text-brand-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-brand-lightGray text-xs">Drills</Label>
        {drills.map((drill, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto] gap-2 items-start border border-brand-gray/20 rounded-lg p-2"
          >
            <div className="space-y-2">
              <Input
                placeholder="Drill name"
                value={drill.name}
                onChange={(e) => updateDrill(i, "name", e.target.value)}
                className="bg-brand-black border-brand-gray/30 text-brand-white text-sm"
              />
              <Input
                placeholder="Sets (e.g. 3x10)"
                value={drill.sets}
                onChange={(e) => updateDrill(i, "sets", e.target.value)}
                className="bg-brand-black border-brand-gray/30 text-brand-white text-sm"
              />
              <Input
                placeholder="Notes (optional)"
                value={drill.notes}
                onChange={(e) => updateDrill(i, "notes", e.target.value)}
                className="bg-brand-black border-brand-gray/30 text-brand-white text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeDrill(i)}
              disabled={drills.length <= 1}
              className="text-brand-gray hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDrill}
          className="border-brand-gray/30 text-brand-lightGray"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Drill
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {INTENSITIES.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setIntensity(level)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              intensity === level
                ? "bg-brand-orange text-white border-brand-orange"
                : "border-brand-gray/40 text-brand-lightGray"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Notes for athlete (optional)"
        value={trainerNotes}
        onChange={(e) => setTrainerNotes(e.target.value)}
        rows={2}
        className="bg-brand-black border-brand-gray/30 text-brand-white resize-none text-sm"
      />
      <Button
        onClick={handleSend}
        disabled={!canSend || sending}
        className="w-full bg-gradient-orange-blue text-white"
      >
        {sending ? "Sending..." : "Send Workout"}
      </Button>
    </div>
  );
}
