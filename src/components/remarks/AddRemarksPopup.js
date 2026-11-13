import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { showSuccessOrError } from '../../services/commonService';

import { addEmployerRemark, addProcessingRemark, addWorkerRemark, updateEmployerRemark, updateProcessingRemark, updateWorkerRemark, addInvoiceRemarks, updateInvoiceRemarks } from '../../redux/Slices/remarks/RemarkSlice';
import { addRemarksSchema, remarkMaxLength } from './addRemarksSchema';
import SubmitSpinnerButton from '../ReusableComponents/SubmitSpinnerButton';
import translation from '../../utils/translation';

function AddRemarksPopup({ onClose, initialData, updateInitialData, entityType, entityId }) {
    const dispatch = useDispatch();
    const [submitStatus, setSubmitStatus] = useState('idle');
    const maxLength = remarkMaxLength(entityType);

    const { register, handleSubmit, watch,formState: { errors }, reset } = useForm({
        resolver: yupResolver(addRemarksSchema),
        defaultValues: {
            remarks: initialData?.remarks || '',
        },
    });

    useEffect(() => {
        if (initialData) {
            reset(initialData);
        }
    }, [initialData, reset]);

    const onSubmit = (data) => {
        const payload = {
            remarks: data.remarks,
        };
        if (entityType === 'employer') {
            payload.employer_id = entityId;
        } else if (entityType === 'worker') {
            payload.worker_id = entityId;
            payload.module_key = entityType;
        } else if (entityType === 'processing') {
            payload.contract_id = entityId;
        } else if (entityType === 'invoice') {
            payload.contract_invoices_id = entityId;
        }
        setSubmitStatus('loading');
        if (initialData) {
            if (entityType === 'employer') {
                dispatch(updateEmployerRemark({ ...payload, remark_id: data.id })).then(res => {
                    showSuccessOrError(res);
                    updateInitialData(null);
                    reset(initialData);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'worker') {
                dispatch(updateWorkerRemark({ ...payload, remark_id: data.id, module_key: entityType })).then(res => {
                    showSuccessOrError(res);
                    updateInitialData(null);
                    reset(initialData);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'processing') {
                dispatch(updateProcessingRemark({ ...payload, remark_id: data.id })).then(res => {
                    showSuccessOrError(res);
                    updateInitialData(null);
                    reset(initialData);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'invoice') {
                dispatch(updateInvoiceRemarks({ ...payload, remark_id: data.id })).then(res => {
                    showSuccessOrError(res);
                    updateInitialData(null);
                    reset(initialData);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            }
        } else {
            if (entityType === 'employer') {
                dispatch(addEmployerRemark(payload)).then(res => {
                    showSuccessOrError(res);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'worker') {
                dispatch(addWorkerRemark(payload)).then(res => {
                    showSuccessOrError(res);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'processing') {
                dispatch(addProcessingRemark(payload)).then(res => {
                    showSuccessOrError(res);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            } else if (entityType === 'invoice') {
                dispatch(addInvoiceRemarks(payload)).then(res => {
                    showSuccessOrError(res);
                    setSubmitStatus('fulfilled');
                    onClose();
                });
            }
        }
    };

    return (
        <form onSubmit={ handleSubmit(onSubmit) }>
            <div className="form-group mb-0">
                <textarea
                    maxLength={ maxLength }
                    className={ `form-control ${ errors.remarks ? 'is-invalid' : '' }` }
                    { ...register('remarks') }
                    placeholder={ translation('key_add_remarks_here') }
                    rows={ 4 }
                />
                <div className="text-right lh-18 mb-1">
                    <small className="text-muted">
                        {watch('remarks')?.length || 0}/{ maxLength }
                    </small>
                </div>
                
                { errors.remarks && (
                    <div className="invalid-feedback mt-0">
                        { errors.remarks.message }
                    </div>
                ) }
            </div>
            <div className='action-btns d-flex justify-content-end'>
                <button type="button" className="btn btn-link btn-sm mr-2" onClick={ onClose }>{ translation('key_cancel') }</button>
                <SubmitSpinnerButton submitText={ translation('key_save') } status={ submitStatus } buttonClass="btn btn-link btn-sm" />
            </div>
        </form>
    );
}

AddRemarksPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    initialData: PropTypes.object,
    updateInitialData: PropTypes.func,
    entityType: PropTypes.string.isRequired,
    entityId: PropTypes.any.isRequired,
};

export default AddRemarksPopup;
