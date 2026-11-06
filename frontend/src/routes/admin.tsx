import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdmin } from "@/lib/api";
import { AdminPage } from "@/components/admin-pages";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("meetiq_token")) throw redirect({ to: "/login" });
      if (!isAdmin()) throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [{ title: "Admin — MeetingMind" }],
  }),
  component: AdminPage,
});
