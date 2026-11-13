import * as yup from 'yup';
import translation from '../../../../../utils/translation';

export const permissionFormSchema = yup.object().shape({
    manager_id: yup.string()
        .when('staff_type', {
            is: 'internal',
            then: yup.string().required(translation('key_this_field_is_required')),
            otherwise: yup.string().nullable()
        }),
    staff_branch_id: yup.string()
        .nullable()
        .when('staff_type', {
            is: (value) => value === 'partner',
            then: yup.string()
                .required(translation('key_this_field_is_required'))
                .typeError(translation('key_this_field_is_required'))
                .test(
                    'is-comma-separated-numbers',
                    translation('key_invalid_branch_selection'),
                    value => {
                        if (!value) return false;
                        return value.split(',').every(id => !isNaN(id) && id.trim() !== '');
                    }
                ),
            otherwise: yup.string().nullable().notRequired()
        }),
    // spoken_languages: yup.array()
    //     .of(yup.number().required(translation('key_language_is_required')))
    //     .min(1, translation('key_at_least_one_spoken_language_is_required'))
    //     .required(translation('key_spoken_language_is_required')),
    is_assign_employer: yup.boolean(),
    employer_assign_type: yup
        .string()
        .nullable()
        .transform((value, originalValue) => (originalValue === "" ? null : value))
        .when('is_assign_employer', {
            is: true,
            then: yup.string().required(translation('key_employer_assignment_type_is_required')).nullable(),
            otherwise: yup.string().nullable(),
        }),
    is_assign_worker: yup.boolean(),
    worker_assign_type: yup
        .string()
        .nullable()
        .transform((value, originalValue) => (originalValue === "" ? null : value))
        .when('is_assign_worker', {
            is: true,
            then: yup.string().required(translation('key_worker_assignment_type_is_required')).nullable(),
            otherwise: yup.string().nullable(),
        }),
    worker_staff_assign: yup.array()
        .of(yup.number().required(translation('key_worker_staff_assignment_is_required')))
        .nullable(),
    is_assign_contract: yup.boolean(),
    contract_assign_type: yup
        .string()
        .nullable()
        .transform((value, originalValue) => (originalValue === "" ? null : value))
        .when('is_assign_contract', {
            is: true,
            then: yup.string().required(translation('key_contract_assignment_type_is_required')).nullable(),
            otherwise: yup.string().nullable(),
        }),
    contract_staff_assign: yup.array()
        .of(yup.number().required(translation('key_contract_staff_assignment_is_required')))
        .nullable(),
}).test('worker-contract-staff-assign-validation', function (values, context) {
    const { is_assign_worker, is_assign_contract } = values;
    const workerStaffAssign = context.options.context?.worker_staff_assign;
    const contractStaffAssign = context.options.context?.contract_staff_assign;

    if (is_assign_worker && (!workerStaffAssign || workerStaffAssign.length === 0)) {
        return this.createError({
            path: 'worker_staff_assign',
            message: translation('key_at_least_one_worker_staff_assignment_is_required_when_worker_assignment_is_enabled'),
        });
    }

    if (is_assign_contract && (!contractStaffAssign || contractStaffAssign.length === 0)) {
        return this.createError({
            path: 'contract_staff_assign',
            message: translation('key_at_least_one_contract_staff_assignment_is_required_when_contract_assignment_is_enabled'),
        });
    }

    return true;
});
