import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import DateInput from "../../../../../../components/ui/DateInput";
import { addCurrentWorkerSchema } from "../../../../../../components/Layout/popups/add-current-worker/addCurrentWorkerSchema";
import { addCurrentWorkerFormState } from "../../../../../../components/ReusableComponents/form-states";
import { addEmpCurrentWorker, updateEmpCurrentWorker } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import { validateHKID } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";
import styles from "../../NewEmployerModal.module.css";

const CurrentWorkerModal = ({ employerId, worker, onClose }) => {
    const dispatch = useDispatch();
    const isEdit = Boolean(worker);
    const [busy, setBusy] = useState(false);
    const [hkidDisplay, setHkidDisplay] = useState(worker?.hk_id ? (validateHKID(worker.hk_id).formatted || worker.hk_id) : '');
    const { register, control, handleSubmit, setValue, setError, clearErrors, formState: { errors } } = useForm({
        resolver: yupResolver(addCurrentWorkerSchema),
        defaultValues: worker
            ? { worker_name: worker.worker_name || '', employer_name: worker.employer_name || '', hk_id: worker.hk_id || '', staying_till_date_in_hk: worker.staying_till_date_in_hk || '' }
            : addCurrentWorkerFormState,
    });

    const handleHkid = useCallback((value) => {
        const res = validateHKID(value);
        setHkidDisplay(res.formatted || value.toUpperCase());
        setValue('hk_id', res?.hkid || value);
        if (!res.valid) setError('hk_id', { type: 'manual', message: res?.error });
        else clearErrors('hk_id');
    }, [setValue, setError, clearErrors]);

    const onSubmit = useCallback((data) => {
        const hkid = validateHKID(data.hk_id);
        if (!hkid.valid) {
            setError('hk_id', { type: 'manual', message: hkid.error });
            return;
        }
        const payload = {
            ...data,
            employer_id: employerId,
            hk_id: (hkid.hkid || '').replace(/[()]/g, ''),
            staying_till_date_in_hk: dayjs(data.staying_till_date_in_hk).format('YYYY-MM-DD'),
        };
        setBusy(true);
        const request = isEdit
            ? dispatch(updateEmpCurrentWorker({ employer_worker_id: worker.id, ...payload }))
            : dispatch(addEmpCurrentWorker(payload));
        request.then((res) => {
            setBusy(false);
            showSuccessOrError(res);
            if (!res.error) onClose(true);
        });
    }, [dispatch, employerId, isEdit, worker?.id, onClose, setError]);

    return (
        <Modal
            title={ headingCase(translation(isEdit ? 'key_edit_current_worker' : 'key_add_current_workers')) }
            width={ 480 }
            onClose={ () => onClose(false) }
            footer={ (
                <>
                    <span className={ styles.spacer } />
                    <Btn variant="secondary" onClick={ () => onClose(false) } disabled={ busy }>{ translation('key_cancel') }</Btn>
                    <Btn variant="primary" type="submit" form="employer-current-worker-form" disabled={ busy }>
                        { busy ? translation('key_loading') : translation(isEdit ? 'key_update' : 'key_add_worker') }
                    </Btn>
                </>
            ) }
        >
            <form id="employer-current-worker-form" className={ styles.grid } onSubmit={ handleSubmit(onSubmit) } noValidate>
                <div className={ `${ styles.field } ${ styles.fieldFull }` }>
                    <div className={ styles.fieldLabel }><span>{ translation('key_worker_name') }<span className={ styles.required }>*</span></span></div>
                    <input type="text" className={ `${ styles.input } ${ errors.worker_name ? styles.invalid : '' }` } { ...register('worker_name') } />
                    { errors.worker_name && <div className={ styles.fieldError }>{ errors.worker_name.message }</div> }
                </div>
                <div className={ `${ styles.field } ${ styles.fieldFull }` }>
                    <div className={ styles.fieldLabel }><span>{ translation('key_employer_name') }<span className={ styles.required }>*</span></span></div>
                    <input type="text" className={ `${ styles.input } ${ errors.employer_name ? styles.invalid : '' }` } { ...register('employer_name') } />
                    { errors.employer_name && <div className={ styles.fieldError }>{ errors.employer_name.message }</div> }
                </div>
                <div className={ styles.field }>
                    <div className={ styles.fieldLabel }><span>{ translation('key_hkid') }<span className={ styles.required }>*</span></span></div>
                    <input type="text" value={ hkidDisplay } placeholder={ translation('key_hkid_example') } className={ `${ styles.input } ${ errors.hk_id ? styles.invalid : '' }` } onChange={ (event) => handleHkid(event.target.value) } />
                    { errors.hk_id && <div className={ styles.fieldError }>{ errors.hk_id.message }</div> }
                </div>
                <div className={ styles.field }>
                    <div className={ styles.fieldLabel }><span>{ translation('key_stay_in_hk_until') }<span className={ styles.required }>*</span></span></div>
                    <Controller name="staying_till_date_in_hk" control={ control } render={ ({ field }) => (
                        <DateInput value={ field.value } onChange={ field.onChange } onBlur={ field.onBlur } invalid={ Boolean(errors.staying_till_date_in_hk) } />
                    ) } />
                    { errors.staying_till_date_in_hk && <div className={ styles.fieldError }>{ errors.staying_till_date_in_hk.message }</div> }
                </div>
            </form>
        </Modal>
    );
};

CurrentWorkerModal.propTypes = {
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    worker: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(CurrentWorkerModal);
