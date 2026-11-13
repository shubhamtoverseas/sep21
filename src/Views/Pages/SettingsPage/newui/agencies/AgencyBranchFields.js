import React, { useCallback, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useWatch } from "react-hook-form";
import { MACAU_LOCATION_ID } from "../../../../../components/ReusableComponents/constants";
import BranchFields from "../branches/BranchFields";
import { AGENCY_CATEGORY } from "../settingsNewUiConstants";

/** One inline branch (`branch_data[index]`) inside the Add Agency form. */
const AgencyBranchFields = ({
    control,
    index,
    errors,
    countries,
    districts,
    selectedCountryCode,
    onCountryChange,
    timezoneOptions,
    agencyCategory,
    agencyCountryId,
    setValue,
    clearErrors,
}) => {
    const namePrefix = `branch_data[${index}]`;
    const watchName = `branch_data.${index}`;
    const isPartner = agencyCategory === AGENCY_CATEGORY.PARTNER;
    const isHost = agencyCategory === AGENCY_CATEGORY.HOST;

    const branchCountry = useWatch({ control, name: `${watchName}.branch_country_code` });
    const isMacau = Number(branchCountry) === MACAU_LOCATION_ID;

    const districtOptions = useMemo(
        () => (Array.isArray(districts[selectedCountryCode]) ? districts[selectedCountryCode] : []),
        [districts, selectedCountryCode]
    );

    /* Partner agencies inherit the agency country; the branch country / province are locked. */
    useEffect(() => {
        if (!isPartner) return;
        setValue(`${namePrefix}.branch_country_code`, agencyCountryId);
        setValue(`${namePrefix}.branch_provinces`, null);
        clearErrors([`${namePrefix}.branch_country_code`, `${namePrefix}.branch_provinces`]);
    }, [isPartner, agencyCountryId, namePrefix, setValue, clearErrors]);

    const handleCountryChange = useCallback((event) => {
        const selected = countries.find((country) => String(country.id) === event.target.value);
        onCountryChange(index, selected?.country_code || "");
        if (Number(event.target.value) === MACAU_LOCATION_ID) setValue(`${namePrefix}.branch_provinces`, "");
    }, [countries, index, namePrefix, onCountryChange, setValue]);

    return (
        <BranchFields
            control={control}
            errors={errors}
            namePrefix={namePrefix}
            idPrefix={`branch-${index}`}
            countries={countries}
            districtOptions={districtOptions}
            timezoneOptions={timezoneOptions}
            countryRequired={isHost}
            provinceRequired={isHost && !isMacau}
            countryDisabled={isPartner}
            provinceDisabled={isPartner || isMacau}
            onCountryChange={handleCountryChange}
            setValue={setValue}
            clearErrors={clearErrors}
        />
    );
};

AgencyBranchFields.propTypes = {
    control: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    errors: PropTypes.object,
    countries: PropTypes.array.isRequired,
    districts: PropTypes.object.isRequired,
    selectedCountryCode: PropTypes.string,
    onCountryChange: PropTypes.func.isRequired,
    timezoneOptions: PropTypes.array.isRequired,
    agencyCategory: PropTypes.string,
    agencyCountryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setValue: PropTypes.func.isRequired,
    clearErrors: PropTypes.func.isRequired,
};

export default React.memo(AgencyBranchFields);
