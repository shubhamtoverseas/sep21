import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import LoginLayout from "./LoginLayout";
import routes from "../routes/routesConfig";
import { showSuccessOrError } from "../../../services/commonService";
import './login-reset.css';
import { resetPassword } from "../../../redux/Slices/common/login/LoginSlice";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";

const ResetPasswordPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.email || !location.state?.otp) {
      navigate(routes.login); 
    }
  }, [location.state, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const comingState = location.state || {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const watchPassword = watch("password", "");

  useEffect(() => {
    document.body.className = "authentication-bg authentication-bg-pattern";
  }, []);

  useEffect(() => {
    if (watchPassword) {
      const strength = calculatePasswordStrength(watchPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength("");
    }
  }, [watchPassword]);

  const calculatePasswordStrength = (password) => {
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;

    // Uppercase and lowercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;

    // Number check
    if (/[0-9]/.test(password)) score += 1;

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    if (score <= 1) return "weak";
    if (score <= 2) return "medium";
    if (score <= 3) return "strong";
    return "very-strong";
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case "weak": return "#ff4757";
      case "medium": return "#ffa502";
      case "strong": return "#2ed573";
      case "very-strong": return "#1e90ff";
      default: return "#ddd";
    }
  };

  const getStrengthText = (strength) => {
    switch (strength) {
      case "weak": return "Weak";
      case "medium": return "Medium";
      case "strong": return "Strong";
      case "very-strong": return "Very Strong";
      default: return "";
    }
  };

  const passwordValidation = {
    required: "Password is required",
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters long"
    },
    validate: {
      hasUppercase: (value) =>
        /[A-Z]/.test(value) || "Must contain an uppercase letter",
      hasLowercase: (value) =>
        /[a-z]/.test(value) || "Must contain a lowercase letter",
      hasNumber: (value) =>
        /[0-9]/.test(value) || "Must contain a number",
      hasSpecialChar: (value) =>
        /[!@#$%^&*(),.?":{}|<>]/.test(value) || "Must contain a special character (!,%,@,#, etc)"
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      dispatch(resetPassword({
        email: comingState?.email,
        otp: comingState?.otp,
        password: data?.password,
        confirm_password: data?.confirmPassword
      })).then((res) => {
        setIsSubmitting(false);
        showSuccessOrError(res);
        if (!res.error && res.payload?.status) {
          navigate(routes.login);
        }
      });

    } catch (error) {
      console.error("Reset password error:", error);
    }
  };

  if (!comingState?.email || !comingState?.otp) {
    return null;
  }

  return (
    <LoginLayout title='Reset Password'>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb32">
          <div className="w-100">
            <div className="mb6 position-relative">
              <label className="form-label required">Password</label>
              <div className="position-relative">
                <input
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  {...register("password", passwordValidation)}
                />
                <i
                  className={`ri-eye${showPassword ? "-off" : ""}-fill position-absolute password-eye`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ cursor: "pointer" }}
                ></i>

                {/* Password requirements */}
                {(watchPassword && calculatePasswordStrength(watchPassword) !== 'very-strong') && <div className="password-requirements position-absolute p16">
                  <ul className="list-unstyled mb-0">
                    <li className={`fz12 ${watchPassword.length >= 8 ? "text-success" : ""}`}>
                      <i className={`ri-${watchPassword.length >= 8 ? "check" : "close"}-line mr-1`}></i>
                      Must be at least 8 characters long
                    </li>
                    <li className={`fz12 ${/[A-Z]/.test(watchPassword) && /[a-z]/.test(watchPassword) ? "text-success" : ""}`}>
                      <i className={`ri-${/[A-Z]/.test(watchPassword) && /[a-z]/.test(watchPassword) ? "check" : "close"}-line mr-1`}></i>
                      Must contain an uppercase and a lowercase letter
                    </li>
                    <li className={`fz12 ${/[0-9]/.test(watchPassword) ? "text-success" : ""}`}>
                      <i className={`ri-${/[0-9]/.test(watchPassword) ? "check" : "close"}-line mr-1`}></i>
                      Must contain a number
                    </li>
                    <li className={`fz12 ${/[!@#$%^&*(),.?":{}|<>]/.test(watchPassword) ? "text-success" : ""}`}>
                      <i className={`ri-${/[!@#$%^&*(),.?":{}|<>]/.test(watchPassword) ? "check" : "close"}-line mr-1`}></i>
                      Must contain a special character (!,%,@,#, etc)
                    </li>
                  </ul>
                </div>}
              </div>

              {/* Password Strength Indicator */}
              {watchPassword && (
                <div className="mt-2">
                  <div className="d-flex align-items-center">
                    <div
                      className="flex-grow-1 br8"
                      style={{
                        height: "4px",
                        backgroundColor: "#f0f0f0",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          backgroundColor: getStrengthColor(passwordStrength),
                          width: passwordStrength === "weak" ? "25%" :
                            passwordStrength === "medium" ? "50%" :
                              passwordStrength === "strong" ? "75%" : "100%",
                          transition: "all 0.3s ease"
                        }}
                      />
                    </div>
                    <span
                      className="ml-2 fz12 fw-500"
                      style={{ color: getStrengthColor(passwordStrength) }}
                    >
                      {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}

              {errors.password && (
                <div className="invalid-feedback d-block mt-2">
                  {errors.password.message}
                </div>
              )}
            </div>

            <div className="mb6 position-relative">
              <label className="form-label required">Confirm Password</label>
              <div className="position-relative">
                <input
                  className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === watchPassword || "Passwords do not match"
                  })}
                />
                <i
                  className={`ri-eye${showConfirmPassword ? "-off" : ""}-fill position-absolute password-eye`}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{ cursor: "pointer" }}
                ></i>
              </div>

              {errors.confirmPassword && (
                <div className="invalid-feedback d-block">
                  {errors.confirmPassword.message}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          {isSubmitting ? <button className="btn filled-btn br8 ht47 px-3 py-2">
            <CustomSpinner paddingClass="p-0" loaderColorClass="text-white" />
          </button> :
            <button
              id="submitLoginForm"
              className="btn filled-btn btn-block"
              type="submit"
              disabled={isSubmitting}
            >
              Done
            </button>
          }
          <p className="d-flex justify-content-center mt-3 mb-0">
            Remember Your Password? &nbsp;
            <Link to={routes.login} className="fz16 blue fw-500 lh-normal font-roboto d-flex justify-content-center align-items-center">
              Login
            </Link>
          </p>
        </div>
      </form>
    </LoginLayout>
  );
};

export default ResetPasswordPage;