import { createFileRoute } from "@tanstack/react-router";
import { MeetingWorkspacePage } from "@/components/product-pages";

export const Route = createFileRoute("/meeting/$id")({
  head: () => ({
    meta: [
      { title: "Meeting Details — MeetingMind" },
      {
        name: "description",
        content: "Review a meeting transcript, summary, minutes, and action items in MeetingMind.",
      },
      { property: "og:title", content: "Meeting Details — MeetingMind" },
      {
        property: "og:description",
        content: "Review a meeting transcript, summary, minutes, and action items in MeetingMind.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeetingRoute,
});

function MeetingRoute() {
  const { id } = Route.useParams();
  return <MeetingWorkspacePage id={id} />;
}
