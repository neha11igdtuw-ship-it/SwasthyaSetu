import React from "react";

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f6fafa]">
      <main className="pb-20 md:pb-8">{children}</main>
    </div>
  );
}
