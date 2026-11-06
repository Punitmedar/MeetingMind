import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProcessingPage } from "@/components/product-pages";

export const Route = createFileRoute("/processing")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({
        to: "/login",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Processing Status — MeetingMind" },
      { name: "description", content: "Track meeting processing status in MeetingMind." },
    ],
  }),
  component: ProcessingPage,
});
