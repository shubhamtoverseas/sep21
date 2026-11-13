import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import translation from "../../../../../utils/translation";
import { isAdminUser } from "../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import {
    fetchDirectHirePricing, fetchItemsByService, fetchLocalPricing, fetchOverseasPricing,
} from "../../../../../redux/Slices/settings/price-list/PriceListSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import LastRefresh from "../LastRefresh";
import { PRICE_LIST_PAGE } from "../settingsNewUiConstants";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import Icon from "../../../../../components/Icon/Icon";
import { NAV_DATA, navMeta, pageName, permittedPages } from "./priceListNav";
import { PriceListFrameContext } from "./shared/priceListFrame";
import { DiscardConfirm } from "./shared/PriceEntryParts";
/* after the shared parts, as the other Price List pages import Btn before these styles (one CSS order in the shared chunk) */
import styles from "./PriceList.module.css";

const PAGE_CONTENT = {
    [PRICE_LIST_PAGE.LOCAL]: lazy(() => import("./local/LocalPricingSection")),
    [PRICE_LIST_PAGE.OVERSEAS]: lazy(() => import("./overseas/OverseasPricingSection")),
    [PRICE_LIST_PAGE.DIRECT_HIRE]: lazy(() => import("./direct-hire/DirectHirePricingSection")),
    [PRICE_LIST_PAGE.ITEMS_BY_SERVICE]: lazy(() => import("./items-by-service/ItemsByServiceSection")),
    [PRICE_LIST_PAGE.SKILLS]: lazy(() => import("./skills/SkillsList")),
    [PRICE_LIST_PAGE.COUNTRIES]: lazy(() => import("./countries/PricingCountriesSection")),
    [PRICE_LIST_PAGE.FIXED_ITEMS]: lazy(() => import("./fixed-items/FixedItemsTab")),
    [PRICE_LIST_PAGE.PROMOTIONS]: lazy(() => import("./promotions/PromotionsTab")),
    /* a separate module, shown as before (OP-27-32) */
    [PRICE_LIST_PAGE.WORKER_PROMOTIONS]: lazy(() => import("./worker-promotions/WorkerPromotionsTab")),
};

/* the pages whose nav count needs their saved values, and the thunk that loads them */
const NAV_FETCH = {
    [PRICE_LIST_PAGE.LOCAL]: fetchLocalPricing,
    [PRICE_LIST_PAGE.OVERSEAS]: fetchOverseasPricing,
    [PRICE_LIST_PAGE.DIRECT_HIRE]: fetchDirectHirePricing,
    [PRICE_LIST_PAGE.ITEMS_BY_SERVICE]: fetchItemsByService,
};

/**
 * Settings › Price List (27 Oct package, PL-UI1; layout of the package's reference Price List page): the breadcrumb, the
 * "Price List" title (View only when this user may not edit the page shown), the section nav with what each page needs,
 * the page, and its footer bar. The address names the page (#local, #overseas, …). Leaving a page with unsaved changes
 * asks first, as Cancel does.
 */
// "View only" is per page: MaidMatch keeps its per-area keys, so it shows when this user may not edit the page shown
// (OP-27-33, decided 28 Oct 2026; the reference page has one View / Edit pair).
const PriceListPage = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const pages = useMemo(() => permittedPages(permissions, isAdmin), [permissions, isAdmin]);
    const priceList = useSelector((state) => state.priceList);

    const requested = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    const current = pages.some((p) => p.id === requested) ? requested : pages[0]?.id;
    const [pageState, setPageState] = useState({ changes: 0, canEdit: null, alert: "" });
    const [crumbLabel, setCrumbLabel] = useState(null);
    const crumbBack = useRef(null);
    const [pending, setPending] = useState(null);
    const [footNode, setFootNode] = useState(null);

    const show = useCallback((pageId) => {
        navigate({ pathname: location.pathname, search: location.search, hash: `#${pageId}` });
    }, [location.pathname, location.search, navigate]);
    const permitted = useCallback((pageId) => pages.some((p) => p.id === pageId), [pages]);
    const go = useCallback((pageId) => {
        if (pageId === current || !permitted(pageId)) return;
        if (pageState.changes) setPending(() => () => show(pageId));
        else show(pageId);
    }, [current, pageState.changes, permitted, show]);
    const report = useCallback((next) => {
        setPageState((prev) => (prev.changes === next.changes && prev.canEdit === next.canEdit && prev.alert === next.alert ? prev : next));
    }, []);
    const setCrumb = useCallback((crumb) => {
        crumbBack.current = crumb?.onBack || null;
        setCrumbLabel(crumb?.label || null);
    }, []);
    const frame = useMemo(() => ({ go, permitted, report, setCrumb, footNode }), [go, permitted, report, setCrumb, footNode]);

    /* what each page needs, for the nav: load the counted pages not shown (the page shown loads its own) */
    useEffect(() => {
        Object.entries(NAV_FETCH).forEach(([pageId, fetcher]) => {
            if (pageId !== current && permitted(pageId) && !priceList[NAV_DATA[pageId]]) dispatch(fetcher());
        });
        // once per page shown: a save updates the store, and the counts follow it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current]);

    const Content = current ? PAGE_CONTENT[current] : null;
    const currentName = current ? pageName(current) : "";
    const firstPage = pages[0]?.id;

    return (
        <PriceListFrameContext.Provider value={frame}>
            <div className={`${listStyles.pageWrap} ${styles.plPageWithBar}`}>
                <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                    <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                    <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                    <span>{translation("key_configuration")}</span>
                    {current && (
                        <>
                            <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                            <button type="button" className={styles.plCrumbBtn} onClick={() => go(firstPage)}>{translation("key_price_list")}</button>
                            <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                            {crumbLabel ? (
                                <>
                                    <button type="button" className={styles.plCrumbBtn} onClick={() => crumbBack.current && crumbBack.current()}>{currentName}</button>
                                    <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                                    <span className={shared.breadcrumbCurrent} aria-current="page">{crumbLabel}</span>
                                </>
                            ) : <span className={shared.breadcrumbCurrent} aria-current="page">{currentName}</span>}
                        </>
                    )}
                </nav>

                <div className={listStyles.pageHeader}>
                    <div className={listStyles.pageHeaderBody}>
                        <div className={styles.plTitleRow}>
                            <h1 className={listStyles.pageTitle}>{translation("key_price_list")}</h1>
                            {pageState.canEdit === false && <span className={styles.plRoTag}>{translation("key_pl_view_only")}</span>}
                        </div>
                        {current === PRICE_LIST_PAGE.WORKER_PROMOTIONS && <LastRefresh value={priceList.lastUpdatedWorkerPromotion} />}
                    </div>
                </div>
                {pageState.alert && <p className={styles.plAlert} role="alert">{pageState.alert}</p>}

                {pages.length === 0 ? (
                    <section className={shared.card}><p>{translation("key_pl_no_permission")}</p></section>
                ) : (
                    <div className={styles.plLayout}>
                        <div className={styles.plNavCol}>
                            <nav className={styles.plNav} aria-label={translation("key_pl_sections")}>
                                <ul>
                                    {pages.map((page) => {
                                        const dirty = page.id === current && pageState.changes > 0;
                                        return (
                                            <React.Fragment key={page.id}>
                                                {page.separatorBefore && <li className={styles.plNavSep} role="presentation" />}
                                                <li>
                                                    <button type="button" aria-current={page.id === current ? "page" : undefined} onClick={() => go(page.id)}>
                                                        <span>{translation(page.labelKey)}</span>
                                                        <span className={styles.plNavMeta}>
                                                            {dirty ? (
                                                                <>
                                                                    <span className={styles.plUnsaved} aria-hidden="true" />
                                                                    <span className={styles.plVisuallyHidden}>{translation("key_pl_unsaved_sr")}</span>
                                                                </>
                                                            ) : navMeta(page.id, priceList[NAV_DATA[page.id]])}
                                                        </span>
                                                    </button>
                                                </li>
                                            </React.Fragment>
                                        );
                                    })}
                                </ul>
                            </nav>
                            <label className={styles.plNavSelect}>
                                <span>{translation("key_pl_section")}</span>
                                <select className={styles.plSelect} value={current} onChange={(event) => go(event.target.value)}>
                                    {pages.map((page) => <option key={page.id} value={page.id}>{translation(page.labelKey)}</option>)}
                                </select>
                            </label>
                        </div>
                        <div className={styles.plContent}>
                            {Content && (
                                <Suspense fallback={<div className={shared.loadingState}>{translation("key_loading")}…</div>}>
                                    <Content key={current} />
                                </Suspense>
                            )}
                        </div>
                    </div>
                )}
                {/* the shown page's footer bar (Cancel · Review changes) spans the page, as on the reference page */}
                <div className={styles.plFootSlot} ref={setFootNode} />
            </div>
            {pending && (
                <DiscardConfirm
                    scope={crumbLabel || currentName}
                    unsaved={pageState.changes}
                    onConfirm={() => { const next = pending; setPending(null); next(); }}
                    onClose={() => setPending(null)}
                />
            )}
        </PriceListFrameContext.Provider>
    );
};

export default PriceListPage;
