import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/auth-pages";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password — MeetingMind" }],
  }),
  component: ResetPasswordPage,
});
