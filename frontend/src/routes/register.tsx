import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/auth-pages";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Create Account — MeetingMind" }],
  }),
  component: RegisterPage,
});
