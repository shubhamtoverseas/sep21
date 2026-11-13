import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import { isProcessing } from "../details/contractRecordUtils";
import translation from "../../../../utils/translation";
import { CR_FORM, CR_FORM_LABEL_KEYS, CR_FORM_PERMISSION, CR_FORMS } from "../contractConstants";
import { FormsContext } from "./FxControls";
import useContractForms from "./useContractForms";
import MasterForm from "./MasterForm";
import "./contract-forms.css";

const Id988aForm = lazy(() => import("./Id988aForm"));
const Id988bForm = lazy(() => import("./Id988bForm"));
const Id407Form = lazy(() => import("./Id407Form"));
const OfficialFormPreview = lazy(() => import("./FormsDialogs").then((mod) => ({ default: mod.OfficialFormPreview })));
const ImportFromDocumentDialog = lazy(() => import("./FormsDialogs").then((mod) => ({ default: mod.ImportFromDocumentDialog })));

const SURFACE = { [CR_FORM.MASTER]: MasterForm, [CR_FORM.ID988A]: Id988aForm, [CR_FORM.ID988B]: Id988bForm, [CR_FORM.ID407]: Id407Form };
const stamp = (d) => (d?.created_at ? `${ dayjs(d.created_at).format("DD/MM/YYYY HH:mm") }${ d.created_by_name ? ` · ${ d.created_by_name }` : "" }` : "");

/**
 * Forms tab (prototype formsHTML; PROCESS §4 / §11.4): the Master Form · ID 988A · ID 988B · ID 407 sub-tabs over one
 * canonical model; View official form (official tabs) and Import from document on the toolbar; Save / Cancel and
 * Pull latest data from profile with the Last pulled / Last saved stamps (Forms — Edit); read-only with Forms — View.
 */
const ContractForms = ({ contractId, formPermissions, row }) => {
    /* U-0293 / TERMINAL §1: the statutory forms are Immigration working artefacts — read-only for everyone outside Processing */
    const canEdit = formPermissions.includes(CR_FORM_PERMISSION.EDIT) && isProcessing(row);
    const forms = useContractForms(contractId);
    const [tab, setTab] = useState(CR_FORM.MASTER);
    const [preview, setPreview] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const ctx = useMemo(() => ({ model: forms.model, set: forms.set, readOnly: !canEdit || forms.saving, lookups: forms.lookups }), [forms.model, forms.set, canEdit, forms.saving, forms.lookups]);

    /* unsaved edits are shared by the four sub-tabs; only leaving the page asks */
    useEffect(() => {
        if (!forms.dirty) return undefined;
        const guard = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [forms.dirty]);

    const save = useCallback(() => forms.save(tab), [forms, tab]);
    const Surface = SURFACE[tab];
    const isOfficial = tab !== CR_FORM.MASTER;

    if (forms.loading) return <div className="fx-root"><div className="mcdt-note">{ translation("key_loading") }…</div></div>;
    if (forms.loadError) return <div className="fx-root"><div className="mcdt-card mcdt-note" role="alert">{ forms.loadError }</div></div>;
    return (
        <FormsContext.Provider value={ ctx }>
            <div className="fx-root" data-forms-tab={ tab }>
                <div className="fx-tabs">
                    <div role="tablist" aria-label={ translation("key_forms") } className="fx-tablist">
                        { CR_FORMS.map((f) => (
                            <button key={ f } type="button" role="tab" className={ `fx-tab${ tab === f ? " on" : "" }` } aria-selected={ tab === f } tabIndex={ tab === f ? 0 : -1 } data-fid={ `pftab-${ f }` } onClick={ () => setTab(f) }>{ translation(CR_FORM_LABEL_KEYS[f]) }</button>
                        )) }
                    </div>
                    <span className="grow" />
                    { isOfficial && <button type="button" className="g1-btn" data-fid="view-official" onClick={ () => setPreview(tab) }><Icon name="filetext" size={ 12 } strokeWidth={ 1.5 } />{ translation("key_fx_view_official_form") }</button> }
                    <button type="button" className="g1-btn" data-fid="import-doc" onClick={ () => setImportOpen(true) }><Icon name="download" size={ 12 } strokeWidth={ 1.5 } />{ translation("key_fx_import_from_document") }</button>
                </div>

                { canEdit && (
                    <div className="fx-actions">
                        <Btn variant="secondary" type="button" disabled={ forms.saving } onClick={ forms.pullLatest }><Icon name="refresh" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_pull_latest_data_from_profile") }</Btn>
                        <div className="fx-stamps">
                            { forms.lastPulled && <span>{ translation("key_fx_last_pulled_on") } { stamp(forms.lastPulled) }</span> }
                            { forms.lastSaved && <span>{ translation("key_fx_last_saved_on") } { stamp(forms.lastSaved) }</span> }
                            { forms.pulled && <span className="fx-stamp-warn">{ translation("key_fx_pulled_unsaved") }</span> }
                        </div>
                        <span className="grow" />
                        <Btn variant="secondary" type="button" disabled={ !forms.dirty || forms.saving } onClick={ forms.cancel }>{ translation("key_cancel") }</Btn>
                        <Btn variant="primary" type="button" disabled={ !forms.dirty || forms.saving } onClick={ save }>{ forms.saving ? `${ translation("key_loading") }…` : translation("key_save") }</Btn>
                    </div>
                ) }

                <Suspense fallback={ <div className="mcdt-note">{ translation("key_loading") }…</div> }>
                    <Surface />
                    { preview && <OfficialFormPreview form={ preview } onClose={ () => setPreview(null) } /> }
                    { importOpen && <ImportFromDocumentDialog onClose={ () => setImportOpen(false) } /> }
                </Suspense>
            </div>
        </FormsContext.Provider>
    );
};

ContractForms.propTypes = { row: PropTypes.object, contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, formPermissions: PropTypes.arrayOf(PropTypes.string).isRequired };

export default ContractForms;
