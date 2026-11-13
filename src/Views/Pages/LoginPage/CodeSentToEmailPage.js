import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import LoginLayout from "./LoginLayout";
import routes from "../routes/routesConfig";
import { verifyOTP, forgotPassword } from "../../../redux/Slices/common/login/LoginSlice";
import { showSuccessOrError } from "../../../services/commonService";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";

const CodeSentToEmailPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!location.state?.email) {
      navigate(routes.login); 
    }
  }, [location.state, navigate]);

  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  const {
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors
  } = useForm();

  useEffect(() => {
    document.body.className = "authentication-bg authentication-bg-pattern";
  }, []);

  useEffect(() => {
    // Focus on first input when component mounts
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInputChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Clear any previous errors
    clearErrors("otp");

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");

    // Extract only numbers and limit to 6 digits
    const numbers = pastedData.replace(/\D/g, "").slice(0, 6);

    if (numbers.length > 0) {
      const newOtp = ["", "", "", "", "", ""];

      // Fill the OTP array with pasted numbers
      for (let i = 0; i < numbers.length && i < 6; i++) {
        newOtp[i] = numbers[i];
      }

      setOtp(newOtp);

      // Focus on the next empty input or the last input
      const nextIndex = Math.min(numbers.length, 5);
      inputRefs.current[nextIndex].focus();
    }
  };

  const onSubmit = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("otp", { message: "Please enter complete 6-digit OTP" });
      return;
    }

    setIsSubmitting(true);

    dispatch(verifyOTP({
      email: email,
      otp: otpString
    })).then((res) => {
      showSuccessOrError(res);
      setIsSubmitting(false);
      if (!res.error && res.payload?.status) {
        navigate(routes.resetPassword, { state: { email: email, otp: otpString } });
      }
    })
  };

  const handleResendOtp = () => {
    if (isResending) return;
    setIsResending(true);
    dispatch(forgotPassword({ email })).then((res) => {
      setIsResending(false);
      showSuccessOrError(res);
      if (!res.error && res.payload?.status) {
        setOtp(["", "", "", "", "", ""]);
        clearErrors("otp");
        inputRefs.current[0]?.focus();
      }
    });
  };

  const isOtpComplete = otp.every(digit => digit !== "");

  // Don't render the component if email is not available
  if (!email) {
    return null;
  }

  return (
    <LoginLayout title='Code sent to Email'>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="fz20 fw-400 lh-normal font-roboto mb32">
          Please enter the 6 digit code sent to the email ID: <strong>{email}</strong>
        </p>

        <div className="mb32">
          <div className="w-100 text-center">
            <label className="form-label mx-auto required">OTP</label>
          </div>

          <div className="d-flex justify-content-center align-items-center mx-auto w-75">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                className={`form-control ${index < 5 ? "mr-2" : ""} w60 text-center ${errors.otp ? "is-invalid" : ""
                  }`}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                maxLength="1"
                inputMode="numeric"
                pattern="[0-9]"
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  letterSpacing: "2px"
                }}
              />
            ))}
          </div>

          {errors.otp && (
            <div className="invalid-feedback d-block text-center mt-2">
              {errors.otp.message}
            </div>
          )}
        </div>

        <div className="form-group mb-0 text-center">
          {isSubmitting ? <button className="btn filled-btn br8 ht47 px-3 py-2">
            <CustomSpinner paddingClass="p-0" loaderColorClass="text-white" />
          </button> :
            <button
              className="btn filled-btn btn-block"
              type="submit"
              disabled={isSubmitting || !isOtpComplete}
            >
              Verify OTP
            </button>
          }
        </div>
      </form>

      <div className="mt-3 text-center">
        <button
          type="button"
          className="btn btn-link fz16 blue fw-500 lh-normal font-roboto p-0"
          onClick={handleResendOtp}
          disabled={isResending}
        >
          {isResending ? "Sending..." : "Resend OTP"}
        </button>
      </div>

      <div className="mt-3 text-center">
        <Link to={routes.login} className="fz16 blue fw-500 lh-normal font-roboto d-flex justify-content-center align-items-center">
          <i className="ri-arrow-left-line mr-2"></i>
          Back To Login
        </Link>
      </div>
    </LoginLayout>
  );
};

export default CodeSentToEmailPage;