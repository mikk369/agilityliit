"use client";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  BOOKED: { label: "Kinnitatud", className: "bg-green-100 text-green-700" },
  PENDING: { label: "Ootel", className: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Kinnitatud", className: "bg-green-100 text-green-700" },
  CLUBEVENT: { label: "Klubiüritus", className: "bg-purple-100 text-purple-700" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = STATUS_MAP[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${info.className}`}>
      {info.label}
    </span>
  );
}
