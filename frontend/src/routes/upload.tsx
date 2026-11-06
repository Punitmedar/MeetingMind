import { createFileRoute, redirect } from "@tanstack/react-router";
import { UploadPage } from "@/components/product-pages";

export const Route = createFileRoute("/upload")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("meetiq_token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Upload Meeting — MeetingMind" },
      { name: "description", content: "Upload a meeting recording to MeetingMind." },
      { property: "og:title", content: "Upload Meeting — MeetingMind" },
      { property: "og:description", content: "Upload a meeting recording to MeetingMind." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});
