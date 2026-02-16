import React, { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/shared/AuthInput";
import { Button } from "@/components/shared/AuthButton";
import { useLogin } from "@/hooks/useLogin";

export default function Login() {
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
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to continue your journey
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

        {/* Password Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <button
              type="button"
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
            >
              Forgot?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-5 h-5" />}
            showPasswordToggle
            required
            containerClassName="!mt-0"
          />
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <input
            id="remember"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
          />
          <label
            htmlFor="remember"
            className="ml-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Remember me for 30 days
          </label>
        </div>

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
          Sign In
        </Button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{" "}
        <a
          href="/signup"
          className="font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
        >
          Sign up for free
        </a>
      </p>
    </div>
  );
}
