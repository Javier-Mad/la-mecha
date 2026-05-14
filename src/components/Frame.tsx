"use client";

// Mobile-first centered frame. Outer container of every screen for consistent layout.
export function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="min-h-dvh w-full flex justify-center">
      <div
        className={`relative w-full max-w-[430px] min-h-dvh flex flex-col safe-top safe-bottom px-5 ${className}`}
      >
        {children}
      </div>
    </main>
  );
}
