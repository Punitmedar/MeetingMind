import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/auth-pages";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign In — MeetingMind" }],
  }),
  component: LoginPage,
});
