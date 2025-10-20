import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TrainingEvent } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import {
  createEventCheckoutSession,
  redirectToCheckout,
  registerForFreeEvent,
} from "@/api/stripeService";

export default function Events() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [filter, setFilter] = useState("upcoming"); // upcoming, past, registered

  useEffect(() => {
    loadEvents();
    loadRegistrations();
  }, []);

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const eventId = searchParams.get("event_id");

    if (success && eventId) {
      handlePaymentSuccess();
    } else if (canceled) {
      toast({
        title: "Payment Canceled",
        description: "Your event registration was not completed.",
        variant: "default",
      });
      // Clean up URL
      globalThis.history.replaceState({}, "", "/Events");
    }
  }, [searchParams]);

  const loadEvents = async () => {
    try {
      const data = await TrainingEvent.list();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("user_id", profile.id);

      if (error) throw error;

      const regMap = {};
      data?.forEach((reg) => {
        regMap[reg.event_id] = reg;
      });
      setRegistrations(regMap);
    } catch (error) {
      console.error("Error loading registrations:", error);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setProcessingPayment(true);

      toast({
        title: "Payment Successful!",
        description: "Confirming your registration...",
      });

      // Get event_id from URL
      const urlParams = new URLSearchParams(globalThis.location.search);
      const eventId = urlParams.get("event_id");

      if (eventId && profile) {
        console.log("Creating registration for event:", eventId);

        // Create the registration (webhook should do this, but we do it client-side as fallback)
        const { data: existingReg, error: checkError } = await supabase
          .from("event_registrations")
          .select("*")
          .eq("event_id", eventId)
          .eq("user_id", profile.id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 means no rows found, which is expected
          console.error("Error checking existing registration:", checkError);
        }

        if (!existingReg) {
          // Registration doesn't exist, create it
          const { data: newReg, error: insertError } = await supabase
            .from("event_registrations")
            .insert({
              event_id: eventId,
              user_id: profile.id,
              status: "confirmed",
              notes: "Payment completed via Stripe",
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating registration:", insertError);
            throw insertError;
          }

          console.log("Registration created:", newReg);
        } else {
          console.log("Registration already exists:", existingReg);
        }
      }

      // Reload data to show updated registration
      await loadRegistrations();
      await loadEvents();

      toast({
        title: "Registration Complete!",
        description: "You've been successfully registered for the event",
      });

      // Clean up URL
      globalThis.history.replaceState({}, "", "/Events");
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Registration Error",
        description:
          "Payment was successful but registration failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRegister = async (event) => {
    if (!profile) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for events",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPayment(true);

      // Check if event is free
      if (!event.price || event.price === 0) {
        // Free event - register directly
        await registerForFreeEvent(event.id, profile.id);

        toast({
          title: "Registration Successful!",
          description: `You've been registered for ${event.title}`,
        });

        // Reload registrations
        await loadRegistrations();
        await loadEvents();
        setProcessingPayment(false);
      } else {
        // Paid event - redirect to Stripe checkout
        const priceInCents = Math.round(event.price * 100);

        const { sessionId } = await createEventCheckoutSession({
          eventId: event.id,
          eventTitle: event.title,
          price: priceInCents,
          userId: profile.id,
        });

        // Redirect to Stripe Checkout (this will navigate away from the page)
        await redirectToCheckout(sessionId);
      }
    } catch (error) {
      console.error("Error registering for event:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event",
        variant: "destructive",
      });
      setProcessingPayment(false);
    }
  };

  const handleUnregister = async (event) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", profile.id);

      if (error) throw error;

      toast({
        title: "Unregistered",
        description: `You've been removed from ${event.title}`,
      });

      await loadRegistrations();
      await loadEvents();
    } catch (error) {
      console.error("Error unregistering:", error);
      toast({
        title: "Error",
        description: "Failed to unregister from event",
        variant: "destructive",
      });
    }
  };

  const isEventPast = (eventDate) => {
    return new Date(eventDate) < new Date();
  };

  const isEventFull = (event) => {
    return event.registered_count >= event.max_participants;
  };

  const isUserRegistered = (eventId) => {
    return !!registrations[eventId];
  };

  const getFilteredEvents = () => {
    const now = new Date();

    switch (filter) {
      case "upcoming":
        return events.filter((event) => new Date(event.date) >= now);
      case "past":
        return events.filter((event) => new Date(event.date) < now);
      case "registered":
        return events.filter((event) => isUserRegistered(event.id));
      default:
        return events;
    }
  };

  const filteredEvents = getFilteredEvents();

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-600">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Training Events</h1>
        </div>
        <p className="text-muted-foreground">
          Join group training sessions and special events
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          onClick={() => setFilter("upcoming")}
          size="sm"
        >
          Upcoming
        </Button>
        <Button
          variant={filter === "registered" ? "default" : "outline"}
          onClick={() => setFilter("registered")}
          size="sm"
        >
          My Events
        </Button>
        <Button
          variant={filter === "past" ? "default" : "outline"}
          onClick={() => setFilter("past")}
          size="sm"
        >
          Past Events
        </Button>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No events found</p>
            <p className="text-muted-foreground text-center">
              {filter === "registered"
                ? "You haven't registered for any events yet"
                : filter === "past"
                ? "No past events to display"
                : "Check back soon for upcoming training events"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const isPast = isEventPast(event.date);
            const isFull = isEventFull(event);
            const isRegistered = isUserRegistered(event.id);
            const spotsLeft = event.max_participants - event.registered_count;

            return (
              <Card key={event.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    {isPast && <Badge variant="secondary">Past</Badge>}
                    {isRegistered && !isPast && (
                      <Badge className="bg-green-500">Registered</Badge>
                    )}
                    {isFull && !isRegistered && !isPast && (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {format(
                          new Date(event.date),
                          "MMMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{event.duration_minutes} minutes</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {event.registered_count || 0} / {event.max_participants}{" "}
                        participants
                      </span>
                    </div>

                    {event.price > 0 ? (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">${event.price}</span>
                      </div>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}

                    {!isPast && spotsLeft <= 5 && spotsLeft > 0 && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Only {spotsLeft} spots left!</span>
                      </div>
                    )}
                  </div>

                  {!isPast && (
                    <div className="pt-2">
                      {isRegistered ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleUnregister(event)}
                          disabled={processingPayment}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Unregister
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          disabled={isFull || processingPayment}
                          onClick={() => handleRegister(event)}
                        >
                          {processingPayment ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isFull ? (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Event Full
                            </>
                          ) : event.price > 0 ? (
                            <>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Register (${event.price})
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Register (Free)
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
