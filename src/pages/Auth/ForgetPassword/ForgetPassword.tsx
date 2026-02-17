import React from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/shared/AuthInput";
import { Button } from "@/components/shared/AuthButton";
import { Link } from "react-router-dom";
import { useForgetPassword } from "@/hooks/useForgetPassword";

export default function ForgetPassword() {
  const { email, setEmail, isLoading, emailSent, handleSubmit } =
    useForgetPassword();

  // Show success message after email is sent
  if (emailSent) {
    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Success Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
            Check Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            We've sent password reset instructions to{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {email}
            </span>
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Next Steps:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>Check your inbox for an email from us</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>Click the reset link in the email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>Create a new password</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
              <span>If you don't see the email, check your spam folder</span>
            </li>
          </ul>
        </div>

        {/* Back to Login */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => (window.location.href = "/login")}
        >
          Back to Login
        </Button>

        {/* Resend Link */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Didn't receive the email?{" "}
          <button
            onClick={() => window.location.reload()}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  // Show the reset password form
  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
          Forgot Password?
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your email to receive reset instructions
        </p>
      </div>

      {/* Reset Password Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <Input
          id="email"
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-5 h-5" />}
          required
          helperText="We'll send a password reset link to this email"
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight className="w-5 h-5" />}
          iconPosition="right"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Reset Email"}
        </Button>
      </form>

      {/* Back to Login Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Back to Login
        </Link>
      </p>
    </div>
  );
}
