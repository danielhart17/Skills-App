import TrainerBrowser from "@/components/trainers/TrainerBrowser";

export default function Trainers() {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <TrainerBrowser showHeader />
      </div>
    </div>
  );
}
