import VaccinationWarningModal from "@/components/VaccinationWarningModal";

/**
 * The competitor area. Logging in lands here, so this is where the
 * vaccination warning greets the handler.
 */
export default function CompetitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <VaccinationWarningModal />
      {children}
    </>
  );
}
