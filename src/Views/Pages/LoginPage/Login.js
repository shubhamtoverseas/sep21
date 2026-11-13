import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { login } from "../../../redux/Slices/Auth";
import { clearMessage } from "../../../redux/Slices/Messages";
import { fetchPermissionMapByUser } from "../../../redux/Slices/settings/user-permissions/UserPermissionSlice";
import { Link } from "react-router-dom";
import { ShowToast } from "../../../components/show-toast/ShowToast";
import { fetchPermissionList, fetchOwnerOnboardingList, setUserProfile } from "../../../redux/Slices/settings/users/UsersSlice";
import LoginLayout from "./LoginLayout";
import routes from "../routes/routesConfig";
import { useTranslation } from "react-i18next";
import CircularSpinner from "../../../components/ReusableComponents/CircularSpinner";

const Login = () => {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    document.body.className = "authentication-bg authentication-bg-pattern";
    dispatch(clearMessage());
  }, [dispatch]);


  const changeLanguage = React.useCallback((lng) => {
    i18n.changeLanguage(lng);
  }, [i18n]);

  const onSubmit = React.useCallback(async (data) => {
    try {
      setLoading(true);
      const result = await dispatch(login({
        email: data.email,
        password: data.password
      })).unwrap();


      if (!result?.user?.status) {
        ShowToast('error', result?.user?.message || 'Invalid Credentials');
        return;
      }

      ShowToast('success', result?.user?.message || 'Login Successful');

      const staffId = result?.user?.data?.staff?.id;
      changeLanguage(result?.user?.data?.language);

      const userProfilePhoto = result?.user?.data?.image || '';
      dispatch(setUserProfile(userProfilePhoto));

      const apiCalls = [];

      if (staffId) {
        apiCalls.push(dispatch(fetchPermissionList({ staff_id: staffId })));
        apiCalls.push(dispatch(fetchOwnerOnboardingList()));
      }
      apiCalls.push(dispatch(fetchPermissionMapByUser({ user_id: result.user.data.id })));

      await Promise.allSettled(apiCalls);
      window.location.href = '/dashboard';

    } catch (error) {
      ShowToast('error', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, changeLanguage]);

  return (
    <LoginLayout title='Login'>
      <form onSubmit={ handleSubmit(onSubmit) } noValidate>
        <div className="mb32">
          <label className="form-label required">Email ID</label>
          <input
            className={ `form-control ${ errors.email ? "is-invalid" : "" }` }
            type="email"
            { ...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Please enter a valid email address",
              },
            }) }
          />
          { errors.email && (
            <div className="invalid-feedback d-block">
              { errors.email.message }
            </div>
          ) }
        </div>

        <div className="mb6 position-relative">
          <label className="form-label required">Password</label>
          <div className="position-relative">
            <input
              className={ `form-control ${ errors.password ? "is-invalid" : "" }` }
              type={ showPassword ? "text" : "password" }
              { ...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters long",
                },
              }) }
            />
            <i
              className={ `ri-eye${ showPassword ? "-off" : "" }-fill position-absolute password-eye` }
              onClick={ () => setShowPassword((prev) => !prev) }
            ></i>
          </div>
          { errors.password && (
            <div className="invalid-feedback d-block">
              { errors.password.message }
            </div>
          ) }
        </div>

        <div className="mb32">
          <Link to={ routes.forgotPassword } className="fz16 blue fw-500 lh-normal font-roboto">
            Forgot Password
          </Link>
        </div>

        <div className="form-group mb-0 text-center">
          { loading ? (
            <>
               <button className="btn filled-btn br8 ht47 px-3 py-2" disabled>
                <CircularSpinner paddingClass="p-0" loaderColorClass="text-white" />
              </button>
            </>
          ) : (
            <button
              id="submitLoginForm"
              className="btn filled-btn btn-block"
              type="submit"
            >
              Login
            </button>
          ) }
        </div>
      </form>
    </LoginLayout>
  );
};

export default Login;