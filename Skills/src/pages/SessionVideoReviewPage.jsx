import { useParams } from "react-router-dom";
import SessionVideoReview from "@/components/SessionVideoReview";

export default function SessionVideoReviewPage() {
  const { videoId } = useParams();

  return <SessionVideoReview videoId={videoId} />;
}
