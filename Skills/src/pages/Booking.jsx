import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Trainer } from "@/api/entities";
import { TrainerService } from "@/api/entities";
import { Booking } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { add, format, setHours, setMinutes } from "date-fns";
import { createPageUrl } from "@/utils";
import {
  createBookingCheckoutSession,
  redirectToCheckout,
  verifyBookingPayment,
  getTrainerStripeStatus,
} from "@/api/stripeService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  isDateAvailableForSession,
  parseTimeToHoursMinutes,
  skillLevelLabel,
  toLocalDateKey,
} from "@/lib/sessionBooking";
import { syncBookingToAthleteSchedule } from "@/lib/bookingSchedule";

function safeReturnPath(returnTo) {
  if (!returnTo || typeof returnTo !== "string") return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;
  return returnTo;
}

const BookingStep = ({ number, title, children, isActive }) => (
  <div
    className={`transition-opacity duration-500 ${
      isActive ? "opacity-100" : "opacity-40"
    }`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
        }`}
      >
        {number}
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
    <div className="pl-11">{children}</div>
  </div>
);

async function loadTrainerBookedSlots(trainerId, date) {
  const dayKey = toLocalDateKey(date);
  if (!trainerId || !dayKey) return [];

  const { data, error } = await supabase.rpc("get_trainer_booked_slots", {
    p_trainer_id: trainerId,
    p_day: dayKey,
  });

  if (!error && Array.isArray(data)) {
    return data.map((row) => ({
      start: new Date(row.booking_datetime),
      duration: Number(row.duration_minutes) || 60,
    }));
  }

  // Fallback if RPC not deployed yet — may only return current user's bookings
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const bookings = await Booking.filter({
      trainer_id: trainerId,
      booking_datetime: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString(),
      },
    });
    return (bookings || [])
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({
        start: new Date(b.booking_datetime),
        duration: Number(b.duration_minutes) || 60,
      }));
  } catch (fallbackError) {
    console.warn("Could not load booked slots:", fallbackError);
    return [];
  }
}

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isParent, user } = useAuth();
  const returnTo =
    safeReturnPath(searchParams.get("returnTo")) ||
    (isParent() ? `${createPageUrl("ParentDashboard")}?tab=trainers` : null);
  const browseTrainersPath = returnTo || createPageUrl("Trainers");
  const donePath = returnTo || createPageUrl("Home");
  const [step, setStep] = useState(1);
  const [trainer, setTrainer] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [userNotes, setUserNotes] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerStripeStatus, setTrainerStripeStatus] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const bookingId = searchParams.get("booking_id");

    if (success === "true" && bookingId) {
      toast.success("Payment successful! Your booking is confirmed.");
      setStep(4);
      verifyBookingPayment(bookingId)
        .then(async (booking) => {
          setConfirmedBooking(booking);
          if (booking) {
            await syncBookingToAthleteSchedule(booking, {
              trainerName: trainer?.name,
              location: selectedService?.location,
              serviceName: booking.service_name || selectedService?.name,
            });
          }
        })
        .catch(console.error);
      setSearchParams({});
    } else if (canceled === "true") {
      toast.error("Payment was cancelled. Your booking was not completed.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const trainerId = params.get("trainerId");
    const serviceId = params.get("serviceId");

    if (trainerId) {
      loadInitialData(trainerId, serviceId);
    } else {
      setIsLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (trainer && selectedDate) {
      loadBookedTimes(trainer.id, selectedDate);
    }
  }, [trainer, selectedDate]);

  const loadInitialData = async (trainerId, serviceId) => {
    setIsLoading(true);
    try {
      const [trainerData, servicesData] = await Promise.all([
        Trainer.get(trainerId),
        TrainerService.filter({ trainer_id: trainerId }),
      ]);

      setTrainer(trainerData);
      setServices(servicesData || []);

      try {
        const stripeStatus = await getTrainerStripeStatus(trainerData.id);
        setTrainerStripeStatus(stripeStatus);
      } catch (stripeError) {
        console.log("Could not load Stripe status:", stripeError);
        setTrainerStripeStatus(null);
      }

      if (serviceId) {
        const preselectedService = (servicesData || []).find(
          (s) => s.id === serviceId
        );
        if (preselectedService) {
          applyServiceSelection(preselectedService);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setTrainer(null);
      setServices([]);
    }
    setIsLoading(false);
  };

  const loadBookedTimes = async (trainerId, date) => {
    const slots = await loadTrainerBookedSlots(trainerId, date);
    setBookedSlots(slots);
  };

  const applyServiceSelection = (service) => {
    setSelectedService(service);
    setSelectedTime(null);
    setStep(2);

    if (!service.is_recurring && service.session_date) {
      const [y, m, d] = service.session_date.split("-").map(Number);
      if (y && m && d) {
        setSelectedDate(new Date(y, m - 1, d));
      }
    }
  };

  const generateTimeSlots = () => {
    if (!selectedService || !trainer || !selectedDate) return [];
    if (
      !isDateAvailableForSession(
        selectedDate,
        selectedService,
        trainer.blocked_dates
      )
    ) {
      return [];
    }

    const parsed = parseTimeToHoursMinutes(selectedService.start_time);
    if (!parsed) return [];

    const slotTime = setMinutes(
      setHours(new Date(selectedDate), parsed.hours),
      parsed.minutes
    );
    const duration = Number(selectedService.duration_minutes) || 60;
    const bufferMinutes = trainer.session_buffer_minutes || 15;
    const noticeHours = trainer.min_booking_notice_hours ?? 0;
    const minBookingTime = add(new Date(), { hours: noticeHours });

    if (slotTime <= minBookingTime) return [];

    const slotEnd = add(slotTime, { minutes: duration });
    const overlaps = bookedSlots.some((booked) => {
      const bookedEnd = add(booked.start, {
        minutes: (booked.duration || duration) + bufferMinutes,
      });
      const slotEndWithBuffer = add(slotEnd, { minutes: bufferMinutes });
      return slotTime < bookedEnd && booked.start < slotEndWithBuffer;
    });

    return overlaps ? [] : [slotTime];
  };

  const handleSelectService = (service) => {
    applyServiceSelection(service);
  };

  const handleConfirmBooking = async () => {
    if (!trainer || !selectedService || !selectedTime) return;

    if (!user?.id) {
      toast.error("Please sign in to request a booking.");
      navigate(createPageUrl("Auth"));
      return;
    }

    setIsProcessingPayment(true);

    try {
      const canProcessPayment = trainerStripeStatus?.chargesEnabled;

      if (canProcessPayment && selectedService.price > 0) {
        const { sessionId } = await createBookingCheckoutSession({
          trainerId: trainer.id,
          userId: user.id,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          serviceDuration: selectedService.duration_minutes,
          bookingDatetime: selectedTime.toISOString(),
          userNotes: userNotes,
        });

        await redirectToCheckout(sessionId);
      } else {
        const created = await Booking.create({
          trainer_id: trainer.id,
          user_id: user.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          booking_datetime: selectedTime.toISOString(),
          duration_minutes: selectedService.duration_minutes,
          total_price: selectedService.price,
          user_notes: userNotes,
          // Must match bookings_status_check (pending_payment also allowed after migration)
          status: selectedService.price > 0 ? "pending" : "confirmed",
          payment_status:
            selectedService.price > 0 ? "awaiting_setup" : "free",
          location: selectedService.location || trainer.location || null,
          trainer_name: trainer.name,
        });

        // Ensure schedule sync even if Booking.create helper skipped extras
        if (created) {
          await syncBookingToAthleteSchedule(created, {
            trainerName: trainer.name,
            location: selectedService.location || trainer.location || null,
            serviceName: selectedService.name,
          });
          setConfirmedBooking(created);
        }

        if (selectedService.price > 0 && !canProcessPayment) {
          toast.info(
            "Booking requested! It was added to your schedule. The trainer will contact you about payment."
          );
        } else {
          toast.success("Booking confirmed and added to your schedule!");
        }

        setIsProcessingPayment(false);
        setStep(4);
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast.error(
        error.message || "Failed to process booking. Please try again."
      );
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const params = new URLSearchParams(location.search);
  const trainerId = params.get("trainerId");

  if (!trainerId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Select a Trainer First</h1>
        <p className="text-gray-600 mb-6">
          Please select a trainer from the trainers page to book a session.
        </p>
        <Button onClick={() => navigate(browseTrainersPath)}>
          Browse Trainers
        </Button>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Trainer not found</h1>
        <p className="text-gray-600 mb-6">
          The trainer you&apos;re looking for doesn&apos;t exist or the link is
          invalid.
        </p>
        <Button onClick={() => navigate(browseTrainersPath)}>
          Browse Trainers
        </Button>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="max-w-md w-full text-center p-8 shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            {trainer ? (
              <>
                Your session with {trainer.name} is scheduled and added to{" "}
                <strong>My Schedule</strong>.
              </>
            ) : (
              <>Your booking has been confirmed! Check your schedule for details.</>
            )}
          </p>
          {selectedService && selectedTime ? (
            <div className="text-left p-4 rounded-lg mb-6 bg-gray-50">
              <p>
                <strong>Service:</strong> {selectedService.name}
              </p>
              <p>
                <strong>Date:</strong> {format(selectedTime, "MMMM d, yyyy")}
              </p>
              <p>
                <strong>Time:</strong> {format(selectedTime, "h:mm a")}
              </p>
              {confirmedBooking?.payment_status === "paid" && (
                <p className="mt-2">
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Payment Complete
                  </Badge>
                </p>
              )}
            </div>
          ) : null}
          <Button onClick={() => navigate(createPageUrl("Schedule"))} className="mr-0 mb-2 w-full">
            View My Schedule
          </Button>
          <Button variant="outline" onClick={() => navigate(donePath)} className="w-full">
            {isParent() ? "Back to Parent Dashboard" : "Back to Home"}
          </Button>
        </Card>
      </div>
    );
  }

  const availableSlots = step >= 2 && selectedService ? generateTimeSlots() : [];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">
          Book a session with {trainer.name}
        </h1>
        <p className="text-gray-600 mb-8">
          Choose one of this trainer&apos;s training sessions and an available
          time they offer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <BookingStep
              number={1}
              title="Select a Training Session"
              isActive={step >= 1}
            >
              {step >= 1 && (
                <div className="space-y-3">
                  {services.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      This trainer hasn&apos;t published any training sessions
                      yet.
                    </div>
                  ) : (
                    services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSelectService(service)}
                        className={`w-full text-left p-4 border rounded-lg transition-all ${
                          selectedService?.id === service.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{service.name}</h3>
                          <Badge variant="outline">
                            {skillLevelLabel(service.skill_level)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {service.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                          <span className="font-bold text-blue-600">
                            ${service.price}
                          </span>
                          <span className="text-gray-500">
                            {service.duration_minutes} min
                          </span>
                          {service.is_recurring ? (
                            <span className="text-gray-500">Weekly recurring</span>
                          ) : service.session_date ? (
                            <span className="text-gray-500">
                              {service.session_date}
                              {service.start_time
                                ? ` · ${String(service.start_time).slice(0, 5)}`
                                : ""}
                            </span>
                          ) : null}
                          {service.location ? (
                            <span className="text-gray-500 inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {service.location}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </BookingStep>

            <BookingStep
              number={2}
              title="Choose Date & Time"
              isActive={step >= 2}
            >
              {step === 2 && selectedService && (
                <div className="space-y-4">
                  {!selectedService.start_time ||
                  (!selectedService.is_recurring &&
                    !selectedService.session_date) ||
                  (selectedService.is_recurring &&
                    !(selectedService.recurrence_days || []).length) ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <p className="text-yellow-700 font-medium">
                        Session schedule incomplete
                      </p>
                      <p className="text-yellow-600 text-sm">
                        This offering doesn&apos;t have bookable times yet.
                        Choose another session or ask the trainer to update it.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        disabled={(date) =>
                          !isDateAvailableForSession(
                            date,
                            selectedService,
                            trainer.blocked_dates
                          )
                        }
                        className="rounded-md border"
                      />

                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                          {availableSlots.map((time) => (
                            <Button
                              key={time.toString()}
                              type="button"
                              variant={
                                selectedTime?.getTime() === time.getTime()
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => {
                                setSelectedTime(time);
                                setStep(3);
                              }}
                            >
                              {format(time, "h:mm a")}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No open times on this date. It may already be booked
                          or too close to now.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </BookingStep>

            <BookingStep number={3} title="Confirm & Pay" isActive={step >= 3}>
              {step === 3 && selectedTime && (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Add any notes for {trainer.name.split(" ")[0]} (e.g.,
                    specific skills you want to work on).
                  </p>
                  <Textarea
                    placeholder="Focus on my left-hand dribble..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                  />
                </div>
              )}
            </BookingStep>
          </div>

          {selectedService && (
            <div className="row-start-1 md:col-start-2">
              <Card className="sticky top-8 shadow-xl">
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Trainer</span>
                    <span className="font-semibold">{trainer.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Session</span>
                    <span className="font-semibold text-right">
                      {selectedService.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Level</span>
                    <span className="font-semibold">
                      {skillLevelLabel(selectedService.skill_level)}
                    </span>
                  </div>
                  {selectedTime && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Date</span>
                        <span className="font-semibold">
                          {format(selectedTime, "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Time</span>
                        <span className="font-semibold">
                          {format(selectedTime, "h:mm a")}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t my-2"></div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-600">Total</span>
                    <span className="font-bold text-blue-600">
                      {selectedService.price > 0
                        ? `$${selectedService.price}`
                        : "Free"}
                    </span>
                  </div>

                  {step >= 2 && selectedService.price > 0 && (
                    <div className="pt-2">
                      {trainerStripeStatus?.chargesEnabled ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Secure payment via Stripe</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            This trainer hasn&apos;t set up online payments yet.
                            You can still request a booking and they&apos;ll
                            contact you about payment.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <Button
                      type="button"
                      onClick={handleConfirmBooking}
                      size="lg"
                      disabled={isProcessingPayment}
                      className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : trainerStripeStatus?.chargesEnabled &&
                        selectedService.price > 0 ? (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay ${selectedService.price}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {selectedService.price > 0
                            ? "Request Booking"
                            : "Confirm Booking"}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
