import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardPage } from "@/components/product-pages";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({
        to: "/login",
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "Dashboard — MeetingMind",
      },
      {
        name: "description",
        content: "Review meeting activity, summaries, and action items in MeetingMind.",
      },
      {
        property: "og:title",
        content: "Dashboard — MeetingMind",
      },
      {
        property: "og:description",
        content: "Review meeting activity, summaries, and action items in MeetingMind.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: DashboardPage,
});
