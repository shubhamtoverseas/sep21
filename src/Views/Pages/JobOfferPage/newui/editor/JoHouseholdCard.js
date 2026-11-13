import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Controller, useWatch } from "react-hook-form";
import Icon from "../../../../../components/Icon/Icon";
import { RadioGroup, SelectBox } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { JO_CARE_RECIPIENT_TYPES, JO_EDITOR_COPY, JO_PET_MAX_COUNT, JO_PET_PLUS, JO_PET_TYPES, JO_YES_NO } from "../../jobOfferConstants";

const C = JO_EDITOR_COPY;
const EM = '—';

/* a pet count may be the string "5+" (backend 12 Oct ask 16); it sorts as more than 5 */
const countOf = (rows, type) => { const raw = (rows || []).find((row) => row?.type === type)?.count; return raw === JO_PET_PLUS ? JO_PET_PLUS : (Number(raw) || 0); };
const countNumber = (count) => (count === JO_PET_PLUS ? JO_PET_MAX_COUNT + 1 : Number(count) || 0);
const withCount = (rows, type, count) => {
    const rest = (rows || []).filter((row) => row?.type !== type);
    return countNumber(count) > 0 ? [...rest, { type, count }] : rest;
};

/*
 * Household · admin only (prototype §4; 1 Oct Employer #8; backend D-07): one count per care-recipient type
 * (`care_recipients[] { type, count }`) and per pet type (`pets[] { type, count }`), pets behind a disclosure.
 * No adults row; "Adults working" stays because the API carries it (@migration-unspecified).
 */
const JoHouseholdCard = ({ control, setValue, readOnly = false }) => {
    const watchedCare = useWatch({ control, name: 'care_recipients' });
    const watchedPets = useWatch({ control, name: 'pets' });
    const careRecipients = useMemo(() => (Array.isArray(watchedCare) ? watchedCare : []), [watchedCare]);
    const pets = useMemo(() => (Array.isArray(watchedPets) ? watchedPets : []), [watchedPets]);
    const [petsOpen, setPetsOpen] = useState(() => pets.some((pet) => countNumber(pet?.count) > 0));

    const setCare = useCallback((type, count) => setValue('care_recipients', withCount(careRecipients, type, count), { shouldDirty: true }), [careRecipients, setValue]);
    const setPet = useCallback((type, count) => setValue('pets', withCount(pets, type, count), { shouldDirty: true }), [pets, setValue]);

    /* "1 dog · 2 cats · 1 other" (prototype pet summary) */
    const petSummary = useMemo(() => JO_PET_TYPES
        .map((pet) => ({ pet, n: countOf(pets, pet.type) }))
        .filter(({ n }) => countNumber(n) > 0)
        .map(({ pet, n }) => { const one = pet.label.toLowerCase().replace(/s$/, ''); return `${ n } ${ n === 1 ? one : `${ one }s` }`; })
        .join(' · '), [pets]);

    return (
        <section className="joe-card">
            <div className="keyhd">
                <div className="eyebrow">{ C.sections.household }</div>
                <span className="keytag">{ C.keyInfo }</span>
                <span className="opttag">{ C.optional }</span>
                <span className="hint right">{ C.notShown }</span>
            </div>
            <div className="caretable">
                <div className="carehead"><span>{ C.needsCare }</span><span>{ C.number }</span><span /></div>
                { JO_CARE_RECIPIENT_TYPES.map((row) => {
                    const count = countOf(careRecipients, row.type);
                    return (
                        <div className="carerow" key={ row.type }>
                            <div className="carename">{ row.label }</div>
                            <div>
                                <SelectBox value={ String(count) } onChange={ (event) => setCare(row.type, Number(event.target.value)) } aria-label={ `${ row.label } ${ C.number }` }>
                                    <option value="0">{ EM }</option>
                                    { Array.from({ length: row.max }, (_, i) => i + 1).map((n) => <option key={ n } value={ n }>{ n }</option>) }
                                </SelectBox>
                            </div>
                            <div className="careages">{ count === 0 && <span className="hint">{ C.optional }</span> }</div>
                        </div>
                    );
                }) }
            </div>
            <button type="button" className="petdisc" aria-expanded={ petsOpen } onClick={ () => setPetsOpen((open) => !open) }>
                <Icon name={ petsOpen ? 'chev_down' : 'chev_right' } size={ 11 } />
                <span className="petdisc-l">{ C.pets }</span>
                <span className="hint">{ petSummary }</span>
            </button>
            { /* read-only: the disclosure button is fieldset-disabled, so the table stays viewable */ }
            { (petsOpen || readOnly) && (
                <div className="pettable">
                    { JO_PET_TYPES.map((pet) => {
                        const count = countOf(pets, pet.type);
                        return (
                            <div className="petrow" key={ pet.type }>
                                <div className="carename">{ pet.label }</div>
                                <div>
                                    <SelectBox value={ String(count) } onChange={ (event) => setPet(pet.type, event.target.value === JO_PET_PLUS ? JO_PET_PLUS : Number(event.target.value)) } aria-label={ pet.label }>
                                        <option value="0">{ EM }</option>
                                        { Array.from({ length: JO_PET_MAX_COUNT - 1 }, (_, i) => i + 1).map((n) => <option key={ n } value={ n }>{ n }</option>) }
                                        <option value={ JO_PET_PLUS }>{ JO_PET_PLUS }</option>
                                    </SelectBox>
                                </div>
                                <div />
                            </div>
                        );
                    }) }
                </div>
            ) }
            <div className="fld">
                <span className="lbl">{ C.adultsWorking }</span>
                <Controller control={ control } name="adults_are_working" render={ ({ field }) => (
                    <RadioGroup name="adults_are_working" value={ field.value } options={ JO_YES_NO.map((o) => ({ value: o.value, label: translation(o.key) })) } onChange={ field.onChange } ariaLabel={ C.adultsWorking } />
                ) } />
            </div>
        </section>
    );
};

JoHouseholdCard.propTypes = {
    control: PropTypes.object.isRequired,
    setValue: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,
};

export default React.memo(JoHouseholdCard);
