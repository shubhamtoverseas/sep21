import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import "../../../WorkerPage/worker-detail/newui/worker-details.css";
import "./employer-details.css";
import { fetchEmployerDetail } from "../../../../../redux/Slices/employer/EmployerSlice";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import Btn from "../../../../../components/ui/Btn";
import translation from "../../../../../utils/translation";
import { getCurrentUser } from "../../../../../services/commonService";
import { headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import useEmployerDetails from "./useEmployerDetails";
import EmployerHeaderSection from "./EmployerHeaderSection";
import { EMPLOYER_DETAIL_TABS } from "./employerDetailsConfig";
import { EMPLOYER_LOAD_STATE, EMPLOYER_RECORD_COPY } from "../employerNewUiConstants";

const WkdContextRail = lazy(() => import("../../../WorkerPage/worker-detail/newui/context/WkdContextRail"));
const WkdActivityTab = lazy(() => import("../../../WorkerPage/worker-detail/newui/WkdActivityTab"));
const WorkerContractListing = lazy(() => import("../../../WorkerPage/worker-detail/newui/listing/WorkerContractListing"));
const WorkerInvoiceListing = lazy(() => import("../../../WorkerPage/worker-detail/newui/listing/WorkerInvoiceListing"));
const WorkerInsuranceListing = lazy(() => import("../../../WorkerPage/worker-detail/newui/listing/WorkerInsuranceListing"));
const GcMiniChat = lazy(() => import("../../../Conversaction/newui/GcMiniChat"));
const EmployerJobOfferTab = lazy(() => import("./EmployerJobOfferTab"));
const EditEmployerDrawer = lazy(() => import("./EditEmployerDrawer"));
const EmployerDetailsTab = lazy(() => import("./tabs/EmployerDetailsTab"));

const { JOB_OFFER, DETAILS, CONTRACT, INVOICE, INSURANCE, ACTIVITY } = EMPLOYER_DETAIL_TABS;
const TAB_KEYS = Object.values(EMPLOYER_DETAIL_TABS);

const EmployerDetailsPage = () => {
    const { employer_id, tab: tabParam } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { employer, duplicateCount, loadError, reload, permissions, chat } = useEmployerDetails(employer_id);

    /* The tab lives in the URL (/employers/details/:id/:tab?) so reload, Back and shared links keep it.
       Job Offer is the base address; an unknown segment opens Job Offer (the tab in the route has no surface). */
    const tabFromUrl = TAB_KEYS.includes(tabParam) ? tabParam : JOB_OFFER;
    const [selectedTab, setSelectedTab] = useState(tabFromUrl);
    const setActiveTab = useCallback((key) => {
        setSelectedTab(key);
        navigate(`${ routes.employerDetails.replace(':employer_id', employer_id) }${ key === JOB_OFFER ? '' : `/${ key }` }${ window.location.search }`, { replace: true });
    }, [navigate, employer_id]);
    const [visitedTabs, setVisitedTabs] = useState(() => new Set([tabFromUrl]));
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [railChatMode, setRailChatMode] = useState(false);

    const [searchParams] = useSearchParams();
    const hasJobOfferDeepLink = searchParams.has('jobOfferId') || searchParams.get('createJobOffer') === '1';
    useEffect(() => {
        if (hasJobOfferDeepLink) setSelectedTab(JOB_OFFER);
    }, [hasJobOfferDeepLink]);

    const tabs = useMemo(() => {
        const list = [
            { eventKey: JOB_OFFER, title: translation('key_job_offer') },
            /* PERM §9.4 Details (master): without the grant the tab is hidden, and a typed /details address shows Job Offer */
            ...(permissions.detailsTab ? [{ eventKey: DETAILS, title: translation('key_details') }] : []),
            /* each cross-module tab follows its own module's Access (U-0055); without it the tab is hidden */
            ...(permissions.contractTab ? [{ eventKey: CONTRACT, title: translation('key_contract') }] : []),
            ...(permissions.invoiceTab ? [{ eventKey: INVOICE, title: translation('key_invoice') }] : []),
            ...(permissions.insuranceTab ? [{ eventKey: INSURANCE, title: translation('key_insurance') }] : []),
        ];
        if (permissions.activity) list.push({ eventKey: ACTIVITY, title: translation('key_activity') });
        return list;
    }, [permissions.activity, permissions.detailsTab, permissions.contractTab, permissions.invoiceTab, permissions.insuranceTab]);

    /* a tab the actor cannot see (address typed by hand, or a grant still loading) shows Job Offer instead of an empty page */
    const activeTab = tabs.some((tab) => tab.eventKey === selectedTab) ? selectedTab : JOB_OFFER;
    useEffect(() => {
        setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set([...prev, activeTab])));
    }, [activeTab]);

    const activityEntity = useMemo(() => ({ name: 'employer', id: employer_id }), [employer_id]);
    const canEditRecord = Boolean(permissions.contactEdit || permissions.basicEdit);

    const refreshEmployer = useCallback(() => {
        dispatch(fetchEmployerDetail({ employer_id }));
    }, [dispatch, employer_id]);

    const handleSaved = useCallback(() => {
        setIsEditOpen(false);
        refreshEmployer();
    }, [refreshEmployer]);

    const handleRailSwitchMode = useCallback((mode) => {
        if (mode === 'chat') {
            setRailChatMode(true);
            chat.open();
        } else {
            setRailChatMode(false);
            chat.close();
        }
    }, [chat]);

    const handleRailChatClose = useCallback(() => {
        chat.close();
        setRailChatMode(false);
    }, [chat]);

    const fromGlobalChat = searchParams.get('from') === 'global-chat';
    const handledHandoff = useRef(false);
    useEffect(() => {
        if (!fromGlobalChat || handledHandoff.current || !employer?.user_id) return;
        handledHandoff.current = true;
        handleRailSwitchMode('chat');
    }, [fromGlobalChat, employer?.user_id, handleRailSwitchMode]);

    const onViewDuplicates = useCallback(() => {
        if (employer?.user_id) navigate(routes.DuplicatesEmployers.replace(':user_id', employer.user_id));
    }, [employer?.user_id, navigate]);

    const renderTab = useCallback((tabKey) => {
        switch (tabKey) {
            case JOB_OFFER:
                return <EmployerJobOfferTab employerId={ employer_id } />;
            case DETAILS:
                return <EmployerDetailsTab employer={ employer } employerId={ employer_id } />;
            case CONTRACT:
                return <WorkerContractListing employer_id={ Number(employer_id) } partyColumn="worker" paginated />;
            case INVOICE:
                return <WorkerInvoiceListing employer_id={ employer_id } paginated />;
            case INSURANCE:
                return <WorkerInsuranceListing employer_id={ employer_id } partyColumn="worker" paginated />;
            case ACTIVITY:
                return <WkdActivityTab entity={ activityEntity } />;
            default:
                return null;
        }
    }, [employer_id, employer, activityEntity]);

    /* access denial: prints no code, name, phone or related record, and mounts no rail, tab or modal (adapter showDenied) */
    if (loadError === EMPLOYER_LOAD_STATE.DENIED) {
        return (
            <section className="wkd wkd-page emd">
                <div className="wkd-invalid-entry" data-mc-denied="true" role="status">
                    <div>
                        <span className="mark">!</span>
                        <h2>{ headingCase(translation('key_not_available')) }</h2>
                        <p>{ EMPLOYER_RECORD_COPY.deniedText }</p>
                    </div>
                </div>
            </section>
        );
    }

    /* unknown record: the heading and the requested identifier, nothing else — no substitute employer is opened */
    if (loadError === EMPLOYER_LOAD_STATE.INVALID) {
        return (
            <section className="wkd wkd-page emd">
                <div className="wkd-invalid-entry">
                    <div>
                        <span className="mark">!</span>
                        <h2>{ headingCase(EMPLOYER_RECORD_COPY.invalidTitle) }</h2>
                        <code>{ String(employer_id || '') }</code>
                    </div>
                </div>
            </section>
        );
    }

    if (loadError && !employer) {
        return (
            <section className="wkd wkd-page emd">
                <div className="wkd-invalid-entry">
                    <div>
                        <span className="mark">!</span>
                        <h2>{ headingCase(translation('key_couldnt_load_this_view')) }</h2>
                        <code>{ String(employer_id || '') }</code>
                        <div><Btn variant="secondary" onClick={ reload }>{ translation('key_retry') }</Btn></div>
                    </div>
                </div>
            </section>
        );
    }

    if (!employer) {
        return <section className="wkd wkd-page emd"><div className="emd-loading"><CustomSpinner /></div></section>;
    }

    const duplicateText = `${ translation('key_we_have_found') } ${ duplicateCount } ${ translation('key_potential_duplicate') }${ duplicateCount === 1 ? '' : 's' } ${ translation('key_of_this_employer') }`;

    return (
        <section className="wkd wkd-page emd">
            <Suspense fallback={ null }>
                { /* the ONLY chat surface on this page is the rail's GcMiniChat — the legacy CommonIndividualChat popup fallback
                     is gone ("no old design should trigger anywhere", user 9 Nov); it could still appear when a pending delayed
                     open fired after rapid Context ⇄ Chat toggles */ }
                { /* audit P-01 / W77 (PERM §9.2 vs §9.4, SR-02): the drawer opens with either Edit grant; each block is editable
                     only under its own grant — identity / profile need Basic Details — Edit, contacts need Contact Details — Edit.
                     U-0346 (21 Oct): a block whose View the actor lacks is not shown at all (View is the parent of Edit) */ }
                { isEditOpen && canEditRecord && (
                    <EditEmployerDrawer
                        employer={ employer }
                        locked={ { identity: !permissions.basicEdit, contact: !permissions.contactEdit, profile: !permissions.basicEdit } }
                        hidden={ { identity: !permissions.basicView, contact: !permissions.contactView, profile: !permissions.basicView } }
                        onClose={ () => setIsEditOpen(false) }
                        onSaved={ handleSaved }
                    />
                ) }
            </Suspense>

            <div className="wkd-body">
                <aside className="wkd-rail">
                    { /* the rail renders its own fixed segment control + scrolling cards container */ }
                    <Suspense fallback={ null }>
                        <WkdContextRail
                                entityType="employer"
                                entityId={ employer_id }
                                contextLabelKey="key_employer_context"
                                duplicateCount={ duplicateCount }
                                duplicateText={ duplicateText }
                                duplicatesMode="link"
                                onViewDuplicates={ onViewDuplicates }
                                showRemarks={ permissions.remarks }
                                /* Employer #7 / CR Placement: Follow Up sits after Remarks (shared RecordFollowUp on the rail); partners have no host Follow Up */
                                showFollowUp={ getCurrentUser()?.data?.staff?.staff_type !== 'partner' }
                                showArHistory={ false }
                                showChatHistory={ permissions.chatHistory }
                                worker_id={ employer_id }
                                userId={ employer.employer_user_id }
                                entityDetails={ employer }
                                workerName={ `${ employer.name } ${ employer.surname }` }
                                workerCode={ employer.reference_id }
                                canChat={ permissions.chat }
                                chatMode={ railChatMode }
                                onSwitchMode={ handleRailSwitchMode }
                                chatContent={ (railChatMode && chat.isOpen && chat.info) ? (
                                    <div className="wkd-rail-chat">
                                        <Link className="wkd-globalchat-link" to={ routes.chat }>{ translation('key_global_chat') } ↗</Link>
                                        <GcMiniChat entityDetails={ chat.info } handleOnCloseChat={ handleRailChatClose } user_type={ chat.userType } showTranslate />
                                    </div>
                                ) : null }
                            />
                    </Suspense>
                </aside>

                <div className="wkd-main-col">
                    <EmployerHeaderSection
                        employer={ employer }
                        employerId={ employer_id }
                        showContacts={ permissions.contactView }
                        canBan={ permissions.ban }
                        canRestore={ permissions.restore }
                        onEdit={ canEditRecord ? () => setIsEditOpen(true) : undefined }
                        tabs={ tabs }
                        activeTab={ activeTab }
                        onSelectTab={ setActiveTab }
                    />

                    <div className="wkd-main">
                        <div className="tab-content">
                            <Suspense fallback={ <CustomSpinner /> }>
                                { tabs.map((tab) => visitedTabs.has(tab.eventKey) && (
                                    <div key={ tab.eventKey } className={ tab.eventKey === activeTab ? '' : 'd-none' }>
                                        { renderTab(tab.eventKey) }
                                    </div>
                                )) }
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EmployerDetailsPage;
