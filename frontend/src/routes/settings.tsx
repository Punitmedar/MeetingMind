import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/components/product-pages";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Settings — MeetingMind" },
      {
        name: "description",
        content: "Manage your MeetingMind account and workspace preferences.",
      },
      { property: "og:title", content: "Settings — MeetingMind" },
      {
        property: "og:description",
        content: "Manage your MeetingMind account and workspace preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
