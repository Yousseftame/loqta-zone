import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { validateRegisterForm, type RegisterFormErrors } from "@/types/validation";

const EMPTY_ERRORS: RegisterFormErrors = {
  firstName: "", lastName: "", email: "", phone: "",
  password: "", confirmPassword: "", profileImage: "",
};

export const useRegister = () => {
  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [phone, setPhone]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]           = useState<string | null>(null);
  const [errors, setErrors]                   = useState<RegisterFormErrors>(EMPTY_ERRORS);
  const [touched, setTouched]                 = useState<Partial<Record<keyof RegisterFormErrors, boolean>>>({});
  const [isLoading, setIsLoading]             = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleImageChange = (file: File | null) => {
    setProfileImage(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    // re-validate image field immediately
    const { errors: e } = validateRegisterForm({
      firstName, lastName, email, phone, password, confirmPassword, profileImage: file,
    });
    setErrors((prev :any) => ({ ...prev, profileImage: e.profileImage }));
  };

  const handleBlur = (field: keyof RegisterFormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: e } = validateRegisterForm({
      firstName, lastName, email, phone, password, confirmPassword, profileImage,
    });
    setErrors(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.keys(EMPTY_ERRORS).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as typeof touched
    );
    setTouched(allTouched);

    const { errors: formErrors, isValid } = validateRegisterForm({
      firstName, lastName, email, phone, password, confirmPassword, profileImage,
    });
    setErrors(formErrors);
    if (!isValid) return;

    setIsLoading(true);
    try {
      await register(firstName, lastName, email, phone, password, profileImage);
      navigate("/");
    } catch {
      // handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return {
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    phone, setPhone,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    profileImage, previewUrl, handleImageChange,
    errors, touched, handleBlur,
    isLoading, handleSubmit,
  };
};