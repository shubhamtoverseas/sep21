import * as yup from 'yup';

/* The remark body limit of the modules on this shared panel (Insurance has its own drawer and limit since PROMPT 7). */
export const REMARK_MAX_LENGTH = 500;
export const remarkMaxLength = () => REMARK_MAX_LENGTH;

export const addRemarksSchema = yup.object().shape({
    remarks: yup.string().required('Remarks are required'),
});
