import { useAuth } from "@/store/AuthContext/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { role } = await login(email, password);
      // Role-based redirect
      if (role === "admin" || role === "superAdmin") {
        navigate("/admin");
      } else {
        navigate("/"); // regular users go to the website
      }
    } catch (error: any) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return {
    email, setEmail,
    password, setPassword,
    isLoading,
    showPassword,
    handleSubmit,
    togglePasswordVisibility,
  };
};