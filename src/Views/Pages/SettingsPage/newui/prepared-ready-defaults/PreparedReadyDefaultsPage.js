import React from "react";
import { Link } from "react-router-dom";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import usePreparedReadyDefaults, { PRD_STALE } from "./usePreparedReadyDefaults";
import { CR_PREP_READY } from "../../../Contract/contractConstants";
import { PERM_COPY_KEYS, t } from "../users/permissions/permissionCatalogue";
import "../users/permissions/UserPermissionsEditor.css";

const REGISTERS = [
    { key: CR_PREP_READY.REGISTER.PREPARED, labelKey: PERM_COPY_KEYS.defaultsPrepared },
    { key: CR_PREP_READY.REGISTER.READY, labelKey: PERM_COPY_KEYS.defaultsReady },
];
const STALE_KEYS = { [PRD_STALE.INACTIVE]: "key_inactive", [PRD_STALE.NOT_ELIGIBLE]: PERM_COPY_KEYS.notEligible };

/**
 * Settings → People → Prepared and Ready defaults (client preview "Prepared and Ready defaults" screen): one card
 * "Contract Groups", a group heading per Group 1–4 and two selectors (Prepared default · Ready default) listing the
 * active staff eligible for that register and Group, "No default — Unassigned" first. A stored default that is inactive
 * or no longer eligible stays selected with "… · results in Unassigned". Read-only without `can_edit`.
 */
const PreparedReadyDefaultsPage = () => {
    const page = usePreparedReadyDefaults();
    const title = headingCase(translation("key_cr_prep_ready_defaults"));
    return (
        <div className={ listStyles.pageWrap }>
            <nav className={ shared.breadcrumb } aria-label={ translation("key_settings") }>
                <Link to={ absoluteRoute(routes.settings) }>{ headingCase(translation("key_settings")) }</Link>
                <Icon name="chev_right" size={ 11 } className={ shared.breadcrumbSep } />
                <span>{ headingCase(translation("key_people")) }</span>
                <Icon name="chev_right" size={ 11 } className={ shared.breadcrumbSep } />
                <span className={ shared.breadcrumbCurrent }>{ title }</span>
            </nav>
            <div className="upm" data-mc-module="prepared-ready-defaults">
                <div className="upm-head">
                    <div>
                        <h2>{ title }</h2>
                        <p className="upm-sub">{ t(PERM_COPY_KEYS.defaultsSub) }</p>
                        { page.agencyName && <p className="upm-who"><span className="who-t">{ t(PERM_COPY_KEYS.defaultsAgency) }<span className="dot">·</span><span className="nm">{ page.agencyName }</span></span></p> }
                    </div>
                </div>
                { page.error && <p className="upm-alert" role="alert">{ page.error }</p> }
                { page.defaults === null ? <div className={ shared.loadingState }>{ translation("key_loading") }…</div> : (
                    <section className="upm-sec upm-sec-def" aria-labelledby="prd-groups">
                        <div className="upm-sec-head"><h4 id="prd-groups">{ t(PERM_COPY_KEYS.defaultsGroups) }</h4><p className="upm-sec-sub">{ t(PERM_COPY_KEYS.defaultsGroupsSub) }</p></div>
                        { page.groups.map((group) => (
                            <div key={ group } className="upm-grp upm-grp-def" data-group={ `defaults::Group ${ group }` }>
                                <h5 className="upm-grp-h">{ translation("key_group") } { group }</h5>
                                { REGISTERS.map((r) => {
                                    const cell = page.cellOf(group, r.key);
                                    const value = cell?.staff_id ? String(cell.staff_id) : "";
                                    const options = page.optionsFor(group, r.key);
                                    const stale = page.staleReason(cell, options);
                                    const id = `prd-${ group }-${ r.key }`;
                                    const tagId = `${ id }-tag`;
                                    return (
                                        <div key={ r.key } className="upm-row upm-row-single upm-row-level" data-row={ `defaults::Group ${ group }::${ r.key }` }>
                                            <label className="upm-row-l" htmlFor={ id }>{ t(r.labelKey) }</label>
                                            <div className="upm-cell">
                                                <select className="lvl staff" id={ id } value={ value } aria-label={ `${ translation("key_group") } ${ group } — ${ t(r.labelKey) }` } aria-describedby={ stale ? tagId : undefined }
                                                    disabled={ !page.canEdit || page.savingKey === `${ group }|${ r.key }` } onChange={ (e) => page.save(group, r.key, e.target.value) }>
                                                    <option value="">{ t(PERM_COPY_KEYS.defaultsNone) }</option>
                                                    { options.map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                                                    { stale && <option value={ value } disabled>{ cell?.staff_name || value }</option> }
                                                </select>
                                                { stale && <span className="upm-tag" id={ tagId }>{ translation(STALE_KEYS[stale]) } · { t(PERM_COPY_KEYS.defaultsUnassigned) }</span> }
                                            </div>
                                        </div>
                                    );
                                }) }
                            </div>
                        )) }
                        { /* backend 265 / package N02: when a configured default is applied to a new record */ }
                        <p className="upm-note upm-note-after upm-defaults-rule">{ t(PERM_COPY_KEYS.defaultsRule) }</p>
                    </section>
                ) }
            </div>
        </div>
    );
};

export default PreparedReadyDefaultsPage;
