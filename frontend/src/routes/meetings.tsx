import { createFileRoute, redirect } from "@tanstack/react-router";
import { MeetingsPage } from "@/components/product-pages";

export const Route = createFileRoute("/meetings")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Meetings — MeetingMind" },
      { name: "description", content: "Search and review your recorded meetings in MeetingMind." },
      { property: "og:title", content: "Meetings — MeetingMind" },
      {
        property: "og:description",
        content: "Search and review your recorded meetings in MeetingMind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeetingsPage,
});
