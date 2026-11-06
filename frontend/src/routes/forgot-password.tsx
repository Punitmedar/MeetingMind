import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/components/auth-pages";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot Password — MeetingMind" }],
  }),
  component: ForgotPasswordPage,
});
