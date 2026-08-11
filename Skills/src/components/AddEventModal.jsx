import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const EVENT_TYPES = [
  { value: "game", label: "Game" },
  { value: "practice", label: "Practice" },
  { value: "workout", label: "Workout" },
  { value: "rest", label: "Rest" },
];

const emptyForm = {
  title: "",
  event_type: "practice",
  event_date: "",
  start_time: "",
  opponent: "",
  location: "",
  notes: "",
};

export default function AddEventModal({
  open,
  onOpenChange,
  onSubmit,
  defaultDate,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...emptyForm,
        event_date: defaultDate || format(new Date(), "yyyy-MM-dd"),
      });
      setError(null);
    }
  }, [open, defaultDate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.event_date) {
      setError("Date is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title.trim(),
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time || null,
        opponent: form.event_type === "game" ? form.opponent.trim() || null : null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-brand-black border-brand-gray/30 text-brand-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-white">Add Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-brand-lightGray">
              Title *
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. League game vs Eagles"
              className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-brand-lightGray">Event Type *</Label>
            <Select
              value={form.event_type}
              onValueChange={(v) => handleChange("event_type", v)}
            >
              <SelectTrigger className="bg-brand-charcoal border-brand-gray/30 text-brand-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-brand-black border-brand-gray/30">
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date" className="text-brand-lightGray">
                Date *
              </Label>
              <Input
                id="event_date"
                type="date"
                value={form.event_date}
                onChange={(e) => handleChange("event_date", e.target.value)}
                className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time" className="text-brand-lightGray">
                Start Time
              </Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
              />
            </div>
          </div>

          {form.event_type === "game" && (
            <div className="space-y-2">
              <Label htmlFor="opponent" className="text-brand-lightGray">
                Opponent
              </Label>
              <Input
                id="opponent"
                value={form.opponent}
                onChange={(e) => handleChange("opponent", e.target.value)}
                placeholder="Team name"
                className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="text-brand-lightGray">
              Location
            </Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Gym or court name"
              className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-brand-lightGray">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Optional details"
              rows={3}
              className="bg-brand-charcoal border-brand-gray/30 text-brand-white resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-brand-gray/30 text-brand-lightGray hover:bg-brand-charcoal"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-orange-blue text-white border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
