import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import LoginLayout from "./LoginLayout";
import routes from "../routes/routesConfig";
import { showSuccessOrError } from "../../../services/commonService";
import { forgotPassword } from "../../../redux/Slices/common/login/LoginSlice";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    document.body.className = "authentication-bg authentication-bg-pattern";
  }, []);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      dispatch(forgotPassword({ email: data.email })).then((res) => {
        setLoading(false);
        showSuccessOrError(res);
        if (!res.error && res.payload?.status) {
          navigate(routes.codeSentToEmail, { state: { email: data.email } });
        }
      });

    } catch (error) {
      console.error("Forgot password error:", error);
    }
  };

  return (
    <LoginLayout title="Forgot Password ?">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="fz20 fw-400 lh-normal font-roboto mb32">
          Please enter your email ID, we will send you a link to reset your password
        </p>
        <div className="mb32">
          <label className="form-label required">Email ID</label>
          <input
            className={`form-control ${errors.email ? "is-invalid" : ""}`}
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Please enter a valid email address",
              },
            })}
          />
          {errors.email && (
            <div className="invalid-feedback d-block">
              {errors.email.message}
            </div>
          )}
        </div>

        <div className="form-group mb-0 text-center">
          {loading ? <button className="btn filled-btn br8 ht47 px-3 py-2">
            <CustomSpinner paddingClass="p-0" loaderColorClass="text-white" />
          </button> : <button
            id="submitLoginForm"
            className="btn filled-btn btn-block"
            type="submit"
          >
            Done
          </button>
          }

        </div>
      </form>

      <div className="mt-4 text-center">
        <Link
          to={routes.login}
          className="fz16 blue fw-500 lh-normal font-roboto d-flex justify-content-center align-items-center"
        >
          <i className="ri-arrow-left-line mr-2"></i>
          Back To Login
        </Link>
      </div>
    </LoginLayout>
  );
};

export default ForgotPasswordPage;