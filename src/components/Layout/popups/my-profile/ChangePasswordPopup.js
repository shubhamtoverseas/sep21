import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import SubmitSpinnerButton from '../../../ReusableComponents/SubmitSpinnerButton';
import translation from '../../../../utils/translation';

function ChangePasswordPopup({ onClose }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [submitStatus, setSubmitStatus] = useState('idle');

  const onSubmit = (data) => {
    setSubmitStatus('loading');

    console.log('Submitted Data:', data);

    setTimeout(() => {
      setSubmitStatus('idle');
    }, 1000);
  };

  return (
    <div
      className="modal fade modalCustom addTask show"
      tabIndex={-1}
      style={{ display: 'block', background: 'rgba(0, 0, 0, 0.7)' }}
      role="dialog"
    >
      <div className="modal-dialog">
        <div className="modal-content br20">
          <div className="modal-body p32">
            <div className="d-flex justify-content-between mb24">
              <h5 className="fz20 fw-500">
                {translation('key_password')}
              </h5>
              <i className="ri-close-line cursor-pointer" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">

              {/* Current Password */}
              <div className="form-group mb-3">
                <label className="form-label required">
                  {translation('key_current_password')}
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`}
                  autoComplete="current-password"
                  {...register('currentPassword', { required: true })}
                />
                {errors.currentPassword && (
                  <div className="invalid-feedback">
                    {translation('key_this_field_is_required')}
                  </div>
                )}
              </div>

              {/* New Password */}
              <div className="form-group mb-3">
                <label className="form-label required">
                  {translation('key_new_password')}
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                  autoComplete="new-password"
                  {...register('newPassword', { required: true })}
                />
                {errors.newPassword && (
                  <div className="invalid-feedback">
                    {translation('key_this_field_is_required')}
                  </div>
                )}
              </div>

              {/* Re-enter New Password */}
              <div className="form-group mb-3">
                <label className="form-label required">
                  {translation('key_re_enter_new_password')}
                </label>
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  autoComplete="new-password"
                  {...register('confirmPassword', { required: true })}
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">
                    {translation('key_this_field_is_required')}
                  </div>
                )}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="btn btn-outline mr-2"
                  onClick={onClose}
                >
                  {translation('key_cancel')}
                </button>

                <SubmitSpinnerButton
                  status={submitStatus}
                  submitText={translation('key_save')}
                />
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

ChangePasswordPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ChangePasswordPopup;
