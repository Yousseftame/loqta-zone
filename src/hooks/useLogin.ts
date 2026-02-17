import { useAuth } from '@/store/AuthContext/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/admin");
    } catch (error: any) {
      // Error handling is done in AuthContext, but we can add extra handling here if needed
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    showPassword,
    handleSubmit,
    togglePasswordVisibility
  };
};