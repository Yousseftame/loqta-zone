import React, { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/shared/AuthInput";
import { Button } from "@/components/shared/AuthButton";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Handle login logic here
    console.log("Login:", { email, password });

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent">
          Forgot Password?
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your email to receive reset instructions
        </p>
      </div>
      {/* Login Form */}
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
        >
          Send Reset Email
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Go Back to{" "}
        <a
          href="/signup"
          className="font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
        >
          Login?
        </a>
      </p>
    </div>
  );
}
