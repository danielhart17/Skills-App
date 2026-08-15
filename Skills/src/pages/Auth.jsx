import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Loader2, User, Users } from "lucide-react";

const TRAINER_SAFETY_STATEMENT = `Trainer Safety & Conduct Affirmation

By checking this box, I affirm that:

1. I have never been convicted of a felony, or of any crime involving violence, sexual misconduct, child abuse or neglect, exploitation of a minor, or any other offense that would reasonably raise concern about my fitness to work with youth athletes.
2. I have relevant experience coaching, training, or supervising youth athletes, and I understand my responsibility to maintain professional, appropriate boundaries at all times.
3. I will follow all Skills platform rules and any applicable laws regarding athlete safety, privacy, and conduct, including never engaging in harassment, abuse, grooming, or inappropriate communication with athletes or their families.
4. I understand that Skills may require a background check and may suspend or remove trainers who fail screening, misrepresent information, or violate safety standards.
5. The information I provide in this application (including contact and social media details) is accurate to the best of my knowledge, and I agree to update Skills if that information changes in a way that affects athlete safety or eligibility.

I have read this statement carefully and affirm that it is true.`;

const EMPTY_TRAINER_DETAILS = {
  phone: "",
  instagram_url: "",
  social_media: "",
  website: "",
  trainer_experience_summary: "",
  trainer_safety_affirmed: false,
};

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState("athlete");
  const [trainerDetails, setTrainerDetails] = useState(EMPTY_TRAINER_DETAILS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const { signIn, signUp } = useAuth();

  const updateTrainerField = (field, value) => {
    setTrainerDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (selectedRole === "trainer") {
          if (!trainerDetails.phone.trim()) {
            throw new Error("Phone number is required for trainers.");
          }
          if (!trainerDetails.instagram_url.trim()) {
            throw new Error("Instagram profile is required for trainers.");
          }
          if (!trainerDetails.social_media.trim()) {
            throw new Error("A social media link or handle is required for trainers.");
          }
          if (!trainerDetails.trainer_experience_summary.trim()) {
            throw new Error("Please share a short summary of your experience.");
          }
          if (!trainerDetails.trainer_safety_affirmed) {
            throw new Error(
              "You must read and affirm the Trainer Safety & Conduct statement."
            );
          }
        }

        await signUp(
          email,
          password,
          fullName,
          selectedRole,
          selectedRole === "trainer" ? trainerDetails : null
        );
        setMessage("Account created! Check your email to verify your account.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 p-4">
      <Card
        className={`w-full ${
          isSignUp && selectedRole === "trainer" ? "max-w-xl" : "max-w-md"
        }`}
      >
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img
              src="https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/skills-logo-transparent.png"
              alt="Skills Logo"
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold">Skills</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Create your account to start training"
              : "Welcome back! Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("athlete")}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedRole === "athlete"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <User
                        className={`w-8 h-8 mb-2 ${
                          selectedRole === "athlete"
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="font-semibold">Athlete</span>
                      <span className="text-xs text-gray-500 mt-1">
                        I want to train
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("trainer")}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedRole === "trainer"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <GraduationCap
                        className={`w-8 h-8 mb-2 ${
                          selectedRole === "trainer"
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="font-semibold">Trainer</span>
                      <span className="text-xs text-gray-500 mt-1">
                        Coach athletes
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("parent")}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedRole === "parent"
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Users
                        className={`w-8 h-8 mb-2 ${
                          selectedRole === "parent"
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="font-semibold">Parent</span>
                      <span className="text-xs text-gray-500 mt-1">
                        Track my child
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {selectedRole === "trainer" && (
                  <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        Trainer application details
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Required for athlete safety screening. Website is
                        optional.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainerPhone">Phone number *</Label>
                      <Input
                        id="trainerPhone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={trainerDetails.phone}
                        onChange={(e) =>
                          updateTrainerField("phone", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainerInstagram">
                        Instagram profile *
                      </Label>
                      <Input
                        id="trainerInstagram"
                        type="text"
                        placeholder="@yourhandle or profile URL"
                        value={trainerDetails.instagram_url}
                        onChange={(e) =>
                          updateTrainerField("instagram_url", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainerSocial">
                        Other social media *
                      </Label>
                      <Input
                        id="trainerSocial"
                        type="text"
                        placeholder="TikTok, X, Facebook, LinkedIn, etc."
                        value={trainerDetails.social_media}
                        onChange={(e) =>
                          updateTrainerField("social_media", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainerWebsite">Website (optional)</Label>
                      <Input
                        id="trainerWebsite"
                        type="url"
                        placeholder="https://yoursite.com"
                        value={trainerDetails.website}
                        onChange={(e) =>
                          updateTrainerField("website", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainerExperience">
                        Experience summary *
                      </Label>
                      <Textarea
                        id="trainerExperience"
                        placeholder="Briefly describe your experience training youth athletes (years, ages, settings, specialties)..."
                        value={trainerDetails.trainer_experience_summary}
                        onChange={(e) =>
                          updateTrainerField(
                            "trainer_experience_summary",
                            e.target.value
                          )
                        }
                        rows={4}
                        required
                      />
                    </div>

                    <div className="space-y-3 rounded-lg border border-gray-300 bg-white p-3">
                      <Label className="text-sm font-semibold text-gray-900">
                        Safety & conduct affirmation *
                      </Label>
                      <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {TRAINER_SAFETY_STATEMENT}
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="trainerSafetyAffirm"
                          checked={trainerDetails.trainer_safety_affirmed}
                          onCheckedChange={(checked) =>
                            updateTrainerField(
                              "trainer_safety_affirmed",
                              checked === true
                            )
                          }
                        />
                        <Label
                          htmlFor="trainerSafetyAffirm"
                          className="text-sm font-normal leading-snug cursor-pointer"
                        >
                          I have read this statement and affirm that it is true.
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : isSignUp ? (
                "Sign Up"
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setTrainerDetails(EMPTY_TRAINER_DETAILS);
                    }}
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
