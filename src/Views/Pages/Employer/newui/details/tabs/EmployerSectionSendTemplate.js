import React, { lazy, Suspense, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { fetchCategoryList } from "../../../../../../redux/Slices/settings/templates/TemplateSlice";
import translation from "../../../../../../utils/translation";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";
import { employerDisplayName } from "../employerDetailsConfig";
import { EMPLOYER_SECTION_TEMPLATE, EMPLOYER_TEMPLATE_USER_TYPE } from "../../employerNewUiConstants";

const WkdSendTemplateModal = lazy(() => import("../../../../WorkerPage/worker-detail/newui/WkdSendTemplateModal"));

/* the section's send site: the server checks that section's Send Template grant on this employer */
const SECTION_SITE = Object.freeze({ basic: SEND_SITE.EMPLOYER_BASIC, family: SEND_SITE.EMPLOYER_FAMILY });

/*
 * U-0047 (21 Oct catalogue): Send Template inside a Details section (Basic · Family), rendered only under that section's
 * send grant plus its View (the tab decides). The recipient is the employer; the composer is the shared new-UI one, and the
 * values are resolved by the server for this employer. The section's template category (backend 329 / SQL 21 §A) must exist
 * on the environment: until the employer category list returns the slug the control is disabled and says why. Priyanka
 * 29 Oct (U-0047): the action is gated on the section's send grant + View and the category, never on template availability
 * (a category without a template for the employer shows "Content needed" in the composer).
 */
const EmployerSectionSendTemplate = ({ section, employer }) => {
    const dispatch = useDispatch();
    const [isOpen, setIsOpen] = useState(false);
    const [categoryReady, setCategoryReady] = useState(false);
    const template = EMPLOYER_SECTION_TEMPLATE[section];
    const awaiting = !template?.slug || !categoryReady;

    useEffect(() => {
        if (!template?.slug) return undefined;
        let alive = true;
        dispatch(fetchCategoryList({ module: EMPLOYER_TEMPLATE_USER_TYPE })).then((res) => {
            const rows = res?.payload?.data;
            if (alive && Array.isArray(rows)) setCategoryReady(rows.some((c) => c?.slug === template.slug));
        });
        return () => { alive = false; };
    }, [dispatch, template?.slug]);

    const contextLabel = `${ translation('key_details') } — ${ translation(template?.contextKey || 'key_details') }`;

    return (
        <>
            <button
                type="button"
                className="g2-button"
                disabled={ awaiting }
                aria-disabled={ awaiting || undefined }
                title={ awaiting ? translation('key_awaiting_backend_api') : undefined }
                data-mc-honest={ awaiting ? 'deferred' : undefined }
                onClick={ () => setIsOpen(true) }
            >
                { translation('key_send_template') }
            </button>
            { isOpen && !awaiting && (
                <Suspense fallback={ null }>
                    <WkdSendTemplateModal
                        onClose={ () => setIsOpen(false) }
                        title={ translation('key_send_template') }
                        site={ SECTION_SITE[section] }
                        context={ { employer_id: employer?.employer_id } }
                        userType={ EMPLOYER_TEMPLATE_USER_TYPE }
                        slug={ template.slug }
                        parties={ { employer: { name: employerDisplayName(employer), phone: employer?.whatsapp_number || employer?.mobile_number || "" } } }
                        contextLabel={ contextLabel }
                    />
                </Suspense>
            ) }
        </>
    );
};

EmployerSectionSendTemplate.propTypes = {
    section: PropTypes.oneOf(Object.keys(EMPLOYER_SECTION_TEMPLATE)).isRequired,
    employer: PropTypes.object,
};

export default React.memo(EmployerSectionSendTemplate);
