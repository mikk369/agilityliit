import { redirect } from "next/navigation";

/** The admin area has one screen today; /admin/users follows later. */
export default function AdminPage() {
  redirect("/admin/bookings");
}
