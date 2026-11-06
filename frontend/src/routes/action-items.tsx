import { createFileRoute, redirect } from "@tanstack/react-router";
import { ActionItemsPage } from "@/components/product-pages";

export const Route = createFileRoute("/action-items")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Action Items — MeetingMind" },
      {
        name: "description",
        content: "Track meeting tasks, owners, and deadlines in MeetingMind.",
      },
      { property: "og:title", content: "Action Items — MeetingMind" },
      {
        property: "og:description",
        content: "Track meeting tasks, owners, and deadlines in MeetingMind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActionItemsPage,
});
