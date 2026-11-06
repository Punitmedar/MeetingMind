import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/product-pages";

export const Route = createFileRoute("/analytics")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Analytics — MeetingMind" },
      {
        name: "description",
        content: "Understand meeting volume, duration, and action completion in MeetingMind.",
      },
      { property: "og:title", content: "Analytics — MeetingMind" },
      {
        property: "og:description",
        content: "Understand meeting volume, duration, and action completion in MeetingMind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});
