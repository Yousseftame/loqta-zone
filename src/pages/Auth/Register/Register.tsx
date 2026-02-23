import React, { useRef } from "react";
import { Mail, Lock, ArrowRight, User, Phone, Camera, X } from "lucide-react";
import { Input } from "@/components/shared/AuthInput";
import { Button } from "@/components/shared/AuthButton";
import { Link } from "react-router-dom";
import { useRegister } from "@/hooks/Useregister";
import { getPasswordStrength } from "@/types/validation";

export default function Register() {
  const {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    previewUrl,
    handleImageChange,
    errors,
    touched,
    handleBlur,
    isLoading,
    handleSubmit,
  } = useRegister();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const strength = getPasswordStrength(password);

  const fieldError = (field: keyof typeof errors) =>
    touched[field] ? errors[field] : "";

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2A4863] to-[#2A4863] bg-clip-text text-transparent">
          Create Account
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Join Loqta Zone and start bidding
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* ── Profile Image ── */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            {/* Avatar circle */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#2A4863] dark:hover:border-[#2A4863] transition-all duration-300 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 focus:outline-none"
              style={
                previewUrl
                  ? { borderStyle: "solid", borderColor: "#2A4863" }
                  : {}
              }
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] font-medium tracking-wide">
                    PHOTO
                  </span>
                </div>
              )}
              {/* Hover overlay */}
              {previewUrl && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </button>

            {/* Remove button */}
            {previewUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageChange(null);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Optional · JPG, PNG, WEBP · Max 10MB
          </p>
          {touched.profileImage && errors.profileImage && (
            <p className="text-xs text-red-500">{errors.profileImage}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* ── Name row ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              id="firstName"
              type="text"
              label="First Name"
              placeholder="Youssef"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => handleBlur("firstName")}
              icon={<User className="w-5 h-5" />}
            />
            {fieldError("firstName") && (
              <p className="mt-1 text-xs text-red-500">
                {fieldError("firstName")}
              </p>
            )}
          </div>
          <div>
            <Input
              id="lastName"
              type="text"
              label="Last Name"
              placeholder="Tamer"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => handleBlur("lastName")}
              icon={<User className="w-5 h-5" />}
            />
            {fieldError("lastName") && (
              <p className="mt-1 text-xs text-red-500">
                {fieldError("lastName")}
              </p>
            )}
          </div>
        </div>

        {/* ── Email ── */}
        <div>
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
            icon={<Mail className="w-5 h-5" />}
          />
          {fieldError("email") && (
            <p className="mt-1 text-xs text-red-500">{fieldError("email")}</p>
          )}
        </div>

        {/* ── Phone ── */}
        <div>
          <Input
            id="phone"
            type="tel"
            label="Phone Number"
            placeholder="01011151366"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => handleBlur("phone")}
            icon={<Phone className="w-5 h-5" />}
          />
          {fieldError("phone") && (
            <p className="mt-1 text-xs text-red-500">{fieldError("phone")}</p>
          )}
        </div>

        {/* ── Password ── */}
        <div>
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur("password")}
            icon={<Lock className="w-5 h-5" />}
            showPasswordToggle
          />
          {/* Strength bar — shows once user starts typing */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background:
                        i < strength.score ? strength.color : "rgba(0,0,0,0.1)",
                    }}
                  />
                ))}
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: strength.color }}
              >
                {strength.label}
              </p>
            </div>
          )}
          {fieldError("password") && (
            <p className="mt-1 text-xs text-red-500">
              {fieldError("password")}
            </p>
          )}
        </div>

        {/* ── Confirm Password ── */}
        <div>
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
            icon={<Lock className="w-5 h-5" />}
            showPasswordToggle
          />
          {fieldError("confirmPassword") && (
            <p className="mt-1 text-xs text-red-500">
              {fieldError("confirmPassword")}
            </p>
          )}
        </div>

        {/* ── Submit ── */}
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
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#2A4863] hover:opacity-75 transition-opacity"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
