import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Trainer } from "@/api/entities";
import { TrainerService } from "@/api/entities";
import { Booking } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { add, format, setHours, setMinutes } from "date-fns";
import { createPageUrl } from "@/utils";
import { 
  createBookingCheckoutSession, 
  redirectToCheckout, 
  verifyBookingPayment,
  getTrainerStripeStatus 
} from "@/api/stripeService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isParent } = useAuth();
  const returnTo =
    safeReturnPath(searchParams.get("returnTo")) ||
    (isParent() ? `${createPageUrl("ParentDashboard")}?tab=trainers` : null);
  const browseTrainersPath =
    returnTo || createPageUrl("Trainers");
  const donePath = returnTo || createPageUrl("Home");
  const [step, setStep] = useState(1);
  const [trainer, setTrainer] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [userNotes, setUserNotes] = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerStripeStatus, setTrainerStripeStatus] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Handle payment success/cancel URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const bookingId = searchParams.get("booking_id");

    if (success === "true" && bookingId) {
      // Payment was successful
      toast.success("Payment successful! Your booking is confirmed.");
      setStep(4);
      // Verify the booking
      verifyBookingPayment(bookingId).then((booking) => {
        setConfirmedBooking(booking);
      }).catch(console.error);
      // Clear URL params
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

    console.log("Booking page loaded with params:", {
      trainerId,
      serviceId,
      search: location.search,
    });

    if (trainerId) {
      loadInitialData(trainerId, serviceId);
    } else {
      console.log("No trainerId found in URL params");
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
      console.log(
        "Loading data for trainerId:",
        trainerId,
        "serviceId:",
        serviceId
      );

      const [trainerData, servicesData] = await Promise.all([
        Trainer.get(trainerId),
        TrainerService.filter({ trainer_id: trainerId }),
      ]);

      console.log("Trainer data:", trainerData);
      console.log("Services data:", servicesData);

      setTrainer(trainerData);
      setServices(servicesData);

      // Load trainer's Stripe status
      try {
        const stripeStatus = await getTrainerStripeStatus(trainerData.id);
        setTrainerStripeStatus(stripeStatus);
        console.log("Trainer Stripe status:", stripeStatus);
      } catch (stripeError) {
        console.log("Could not load Stripe status:", stripeError);
        setTrainerStripeStatus(null);
      }

      if (serviceId) {
        const preselectedService = servicesData.find((s) => s.id === serviceId);
        if (preselectedService) {
          setSelectedService(preselectedService);
          setStep(2);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);

      // If there's an error, try to provide some fallback data for testing
      if (trainerId === "10000000-0000-0000-0000-000000000001") {
        console.log("Using fallback data for testing");
        const fallbackTrainer = {
          id: trainerId,
          name: "Coach Mike Johnson",
          bio: "Former NBA player with 15 years of coaching experience",
          specializations: ["shooting", "offense"],
          years_experience: 15,
          location: "Los Angeles, CA",
          verified: true,
          hourly_rate: 100.0,
          rating: 4.8,
        };

        const fallbackServices = [
          {
            id: "30000000-0000-0000-0000-000000000001",
            trainer_id: trainerId,
            name: "1-on-1 Shooting Session",
            description: "Personalized shooting technique and form improvement",
            price: 100.0,
            duration_minutes: 60,
          },
          {
            id: "30000000-0000-0000-0000-000000000002",
            trainer_id: trainerId,
            name: "Group Skills Training",
            description: "Small group training for offensive skills",
            price: 150.0,
            duration_minutes: 90,
          },
        ];

        setTrainer(fallbackTrainer);
        setServices(fallbackServices);

        if (serviceId) {
          const preselectedService = fallbackServices.find(
            (s) => s.id === serviceId
          );
          if (preselectedService) {
            setSelectedService(preselectedService);
            setStep(2);
          }
        }
      } else {
        // Set some default data to prevent infinite loading
        setTrainer(null);
        setServices([]);
      }
    }
    setIsLoading(false);
  };

  const loadBookedTimes = async (trainerId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.filter({
      trainer_id: trainerId,
      booking_datetime: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString(),
      },
    });

    const times = bookings.map((b) => new Date(b.booking_datetime));
    setBookedTimes(times);
  };

  const generateTimeSlots = () => {
    if (!selectedService || !trainer) return [];
    
    // Get day of week for selected date
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const selectedDayName = dayNames[selectedDate.getDay()];
    
    // Check trainer's availability schedule
    const availability = trainer.availability_schedule;
    const daySchedule = availability?.[selectedDayName];
    
    // If trainer has no availability for this day, return empty
    if (!daySchedule?.enabled) {
      return [];
    }
    
    // Check if this date is blocked
    const dateString = selectedDate.toISOString().split("T")[0];
    if (trainer.blocked_dates?.includes(dateString)) {
      return [];
    }
    
    // Parse start and end times from trainer's schedule (or use defaults)
    const [startHour, startMinute] = (daySchedule.start || "09:00").split(":").map(Number);
    const [endHour, endMinute] = (daySchedule.end || "17:00").split(":").map(Number);
    
    // Get buffer and notice settings (with defaults)
    const bufferMinutes = trainer.session_buffer_minutes || 15;
    const noticeHours = trainer.min_booking_notice_hours || 24;
    
    const slots = [];
    
    // Calculate minimum booking time based on notice requirement
    const now = new Date();
    const minBookingTime = add(now, { hours: noticeHours });
    
    // Generate slots based on trainer's schedule
    for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMinute); hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
        // Don't go past end time
        if (hour > endHour || (hour === endHour && minute >= endMinute)) {
          break;
        }
        
        const slotTime = setMinutes(setHours(selectedDate, hour), minute);
        const slotEndTime = add(slotTime, { minutes: selectedService.duration_minutes });
        
        // Check if slot end time goes past trainer's end time
        const trainerEndTime = setMinutes(setHours(selectedDate, endHour), endMinute);
        if (slotEndTime > trainerEndTime) {
          continue; // Skip this slot as the session would end after trainer's available hours
        }

        const isBooked = bookedTimes.some((bookedTime) => {
          // Check for overlap, considering the service duration and buffer
          const bookedEndTimeWithBuffer = add(bookedTime, {
            minutes: selectedService.duration_minutes + bufferMinutes,
          });
          const slotEndTimeWithBuffer = add(slotTime, {
            minutes: selectedService.duration_minutes + bufferMinutes,
          });

          // A slot is booked if it overlaps with an existing booking (including buffer)
          return slotTime < bookedEndTimeWithBuffer && bookedTime < slotEndTimeWithBuffer;
        });

        // Ensure the slot meets the minimum booking notice requirement
        if (slotTime > minBookingTime && !isBooked) {
          slots.push(slotTime);
        }
      }
    }
    
    // Sort slots to ensure they are in chronological order
    slots.sort((a, b) => a.getTime() - b.getTime());
    return slots;
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleConfirmBooking = async () => {
    if (!trainer || !selectedService || !selectedTime) return;
    
    setIsProcessingPayment(true);
    
    try {
      const user = await User.me();
      
      // Check if trainer has Stripe set up for real payments
      const canProcessPayment = trainerStripeStatus?.chargesEnabled;
      
      if (canProcessPayment && selectedService.price > 0) {
        // Use Stripe checkout for real payment
        console.log("Processing real payment via Stripe Connect");
        
        const { sessionId, bookingId } = await createBookingCheckoutSession({
          trainerId: trainer.id,
          userId: user.id,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          serviceDuration: selectedService.duration_minutes,
          bookingDatetime: selectedTime.toISOString(),
          userNotes: userNotes,
        });
        
        // Redirect to Stripe checkout
        await redirectToCheckout(sessionId);
        // Note: Page will redirect, so code below won't execute
        
      } else {
        // Free service or trainer hasn't set up Stripe - create booking directly
        console.log("Creating booking without payment (free or no Stripe setup)");
        
        await Booking.create({
          trainer_id: trainer.id,
          user_id: user.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          booking_datetime: selectedTime.toISOString(),
          duration_minutes: selectedService.duration_minutes,
          total_price: selectedService.price,
          user_notes: userNotes,
          status: selectedService.price > 0 ? "pending_payment" : "confirmed",
          payment_status: selectedService.price > 0 ? "awaiting_setup" : "free",
        });
        
        if (selectedService.price > 0 && !canProcessPayment) {
          toast.info("Booking created! The trainer will contact you about payment.");
        }

        setIsProcessingPayment(false);
        setStep(4); // Move to confirmation step
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast.error(error.message || "Failed to process booking. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  // If no trainerId was provided, show a message to select a trainer first
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

  if (!trainer)
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Trainer not found</h1>
        <p className="text-gray-600 mb-6">
          The trainer you're looking for doesn't exist or the link is invalid.
        </p>
        <Button onClick={() => navigate(browseTrainersPath)}>
          Browse Trainers
        </Button>
      </div>
    );

  if (step === 4) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="max-w-md w-full text-center p-8 shadow-2xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            {trainer ? (
              <>Your session with {trainer.name} is scheduled. You'll receive an email with the details.</>
            ) : (
              <>Your booking has been confirmed! Check your email for details.</>
            )}
          </p>
          {(selectedService && selectedTime) ? (
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
          ) : confirmedBooking ? (
            <div className="text-left p-4 rounded-lg mb-6 bg-gray-50">
              <p>
                <strong>Booking ID:</strong> {confirmedBooking.id?.slice(0, 8)}...
              </p>
              <p>
                <strong>Status:</strong> {confirmedBooking.status}
              </p>
              {confirmedBooking.payment_status === "paid" && (
                <p className="mt-2">
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Payment Complete
                  </Badge>
                </p>
              )}
            </div>
          ) : null}
          <Button onClick={() => navigate(donePath)}>
            {isParent() ? "Back to Parent Dashboard" : "Back to Home"}
          </Button>
        </Card>
      </div>
    );
  }

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
          Follow the steps below to schedule your training.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <BookingStep
              number={1}
              title="Select a Service"
              isActive={step >= 1}
            >
              {step >= 1 && (
                <div className="space-y-3">
                  {services.map((service) => (
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
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-sm text-gray-600">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm mt-2">
                        <span className="font-bold text-blue-600">
                          ${service.price}
                        </span>
                        <span className="text-gray-500">
                          {service.duration_minutes} min
                        </span>
                      </div>
                    </button>
                  ))}
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
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      // Disable past dates
                      if (date < new Date().setHours(0, 0, 0, 0)) return true;
                      
                      // Check if date is blocked
                      const dateString = date.toISOString().split("T")[0];
                      if (trainer?.blocked_dates?.includes(dateString)) return true;
                      
                      return false;
                    }}
                    modifiers={{
                      unavailable: (date) => {
                        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                        const dayName = dayNames[date.getDay()];
                        const daySchedule = trainer?.availability_schedule?.[dayName];
                        return !daySchedule?.enabled;
                      },
                    }}
                    modifiersClassNames={{
                      unavailable: "text-gray-400 line-through",
                    }}
                    className="rounded-md border"
                  />
                  {(() => {
                    // Check if day is blocked or unavailable
                    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                    const selectedDayName = dayNames[selectedDate.getDay()];
                    const daySchedule = trainer?.availability_schedule?.[selectedDayName];
                    const dateString = selectedDate.toISOString().split("T")[0];
                    const isBlocked = trainer?.blocked_dates?.includes(dateString);
                    
                    if (isBlocked) {
                      return (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                          <p className="text-red-700 font-medium">Date Blocked</p>
                          <p className="text-red-600 text-sm">
                            This trainer has marked this date as unavailable.
                          </p>
                        </div>
                      );
                    }
                    
                    if (!daySchedule?.enabled) {
                      return (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                          <p className="text-yellow-700 font-medium">Day Unavailable</p>
                          <p className="text-yellow-600 text-sm">
                            This trainer doesn't offer sessions on {selectedDayName.charAt(0).toUpperCase() + selectedDayName.slice(1)}s.
                          </p>
                        </div>
                      );
                    }
                    
                    const slots = generateTimeSlots();
                    if (slots.length > 0) {
                      return (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                          {slots.map((time) => (
                            <Button
                              key={time.toString()}
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
                      );
                    }
                    
                    return (
                      <p className="text-gray-500">
                        No available slots for this date. All times may be booked or too close to the current time.
                      </p>
                    );
                  })()}
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

          {/* Booking Summary */}
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
                    <span className="text-gray-600">Service</span>
                    <span className="font-semibold">
                      {selectedService.name}
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
                      {selectedService.price > 0 ? `$${selectedService.price}` : "Free"}
                    </span>
                  </div>

                  {/* Stripe status indicator */}
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
                            This trainer hasn't set up online payments yet. 
                            You can still book, and they'll contact you about payment.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <Button
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
                      ) : trainerStripeStatus?.chargesEnabled && selectedService.price > 0 ? (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay ${selectedService.price}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {selectedService.price > 0 ? "Request Booking" : "Confirm Booking"}
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
