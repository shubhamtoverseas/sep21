import dayjs from "dayjs";
import { changeDynamicDateFormate } from "../utils/utils";

export const canMoveToPastExperience = ({
    profileType,
    isCurrentContractAvailable,
    experiences
}) => {
    if (profileType !== 1 || !isCurrentContractAvailable || !Array.isArray(experiences)) {
        return false;
    }

    // find current contract
    const currentContractExp = experiences.find(
        exp => Number(exp?.current_contract) === 1
    );

    if (!currentContractExp) return false;

    const requiredFields = [
        'worker_role',
        'work_country_id',
        'start_date',
        'end_date',
        'district_id',
        'employer_nationality',
        'spoken_language',
        'main_duties',
        'family_size',
        'contract_status'
    ];

    return requiredFields.every(field => {
        const value = currentContractExp[field];

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return value !== null && value !== undefined && value !== '';
    });
};

/* WORKER.md Step 2: Macau is selectable for Local workers only — matched on the country row, never on the worker type */
export const isMacauCountry = (country) =>
    /macau|macao/i.test(String(country?.name || '')) || String(country?.country_code || '').replace(/\D/g, '') === '853';

export const isCurrentContractExp = (experience) => {
    return experience?.find(
        exp => Number(exp?.current_contract) === 1
    );
};

export const getcurrentcontractexp = (experienceArray) => {
    return experienceArray?.length > 0 && experienceArray?.filter(exp => exp?.current_contract === 1);
}

export const isEmptyCurrentContract = (currentContract) => {
    const currentContractData = currentContract?.[0] || {};
   return !currentContractData.worker_role &&
            !currentContractData.start_date &&
            !currentContractData.employer_nationality &&
            !currentContractData.district_id &&
            !currentContractData.family_size &&
            !currentContractData.spoken_language_info?.length &&
            !currentContractData.duty?.length;
}

export const shouldDisableCountrySelection = (experience, workerDetail) => {
    const isCurrentContract = Number(experience?.current_contract) === 1;
    const currentLocationId = workerDetail?.current_location?.id;

    return isCurrentContract && currentLocationId;
}

export const isOlderThanDays = (date, days = 14) => {
  if (!date) return false;
  
  const targetDate = dayjs(date);
  const daysAgo = dayjs().subtract(days, 'days');
  
  return targetDate.isBefore(daysAgo, 'day');
};

export const validateAllOverlaps = (experiences, countries) => {
    const errors = {};
    const active = experiences.filter(exp => exp.action !== "delete");
    for (let i = 0; i < active.length; i++) {
        const exp = active[i];
        const startStr = exp.start_date ? changeDynamicDateFormate(exp.start_date, "YYYY-MM") : null;
        const endStr = exp.end_date ? changeDynamicDateFormate(exp.end_date, "YYYY-MM-DD") : null;
        if (!startStr || !endStr) continue;
        const expStart = dayjs(startStr + "-01");
        const expEnd = dayjs(endStr);
        for (let j = i + 1; j < active.length; j++) {
            const other = active[j];
            const otherStartStr = other.start_date ? changeDynamicDateFormate(other.start_date, "YYYY-MM") : null;
            const otherEndStr = other.end_date ? changeDynamicDateFormate(other.end_date, "YYYY-MM-DD") : null;
            if (!otherStartStr || !otherEndStr) continue;
            const otherStart = dayjs(otherStartStr + "-01");
            const otherEnd = dayjs(otherEndStr);
            if (expStart.isBefore(otherEnd, 'month') && otherStart.isBefore(expEnd, 'month')) {
                const idxI = experiences.indexOf(exp);
                const idxJ = experiences.indexOf(other);
                const countryJ = countries?.find(c => String(c.id) === String(other.work_country_id))?.name || '';
                const countryI = countries?.find(c => String(c.id) === String(exp.work_country_id))?.name || '';
                if (!errors[idxI]) {
                    errors[idxI] = { overlap: `Overlapping Work Experience. This entry overlaps with your ${countryJ} experience (${otherStart.format('MMM YYYY')} \u2013 ${otherEnd.format('MMM YYYY')}). A helper can only work for one employer at a time.` };
                }
                if (!errors[idxJ]) {
                    errors[idxJ] = { overlap: `Overlapping Work Experience. This entry overlaps with your ${countryI} experience (${expStart.format('MMM YYYY')} \u2013 ${expEnd.format('MMM YYYY')}). A helper can only work for one employer at a time.` };
                }
            }
        }
    }
    return errors;
};