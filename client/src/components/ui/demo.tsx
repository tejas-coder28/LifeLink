import KineticGrid from "@/components/ui/kinetic-grid";

export default function Default() {
  return (
    <KineticGrid>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-5 rounded-full border border-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white/70">
          Interactive Background
        </span>
      </div>
    </KineticGrid>
  );
}
