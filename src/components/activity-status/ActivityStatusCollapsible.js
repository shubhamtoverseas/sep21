import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import crossCircleBlue from "../../assets/img/svg/cancel-circle-blue.svg";
import crossCircleLight from "../../assets/img/svg/cross-circle-light.svg";
import verifiedCircleGreen from "../../assets/img/svg/verified-circle-green.svg";
import actionCircle from "../../assets/img/svg/cross-circle-violet1.svg";
import "./activity-status-collapsible.css";
import { changeDynamicDateFormate, normalizeActorName } from "../../utils/utils";
import translation from "../../utils/translation";
import CustomSpinner from "../ReusableComponents/CustomSpinner";
import { ACTIVITY_FLAT_STATUS_META } from "../ReusableComponents/constants";

const FlatActivityList = ({ marginBottom, documentStatus }) => (
    <div className={ `${ marginBottom } wkd-actflat` }>
        { Array.isArray(documentStatus) && documentStatus.map((tab, index) => {
            const meta = ACTIVITY_FLAT_STATUS_META[tab?.current_status];
            if (!meta) return null;
            return (
                <div key={ index } className="wkd-actflat-item">
                    <span className={ `wkd-actflat-dot ${ meta.dot }` } />
                    <div>
                        <div className="wkd-actflat-t">
                            { translation(meta.key) }
                            { meta.withMessage && tab?.message ? ` — ${ tab.message }` : '' }
                        </div>
                        { !meta.noMeta && (
                            <div className="wkd-actflat-m">
                                { translation('key_by') } { normalizeActorName(tab?.log_created_by) } · <span className="wkd-actflat-when">{ changeDynamicDateFormate(tab?.created_at, "DD MMM YYYY HH:mm") }</span>
                            </div>
                        ) }
                    </div>
                </div>
            );
        }) }
    </div>
);
FlatActivityList.propTypes = {
    marginBottom: PropTypes.string,
    documentStatus: PropTypes.any,
};

const ActivityStatusCollapsible = ({ marginBottom = "", documentStatus = [], getNextPage, hasMore = true, loadingLogs = false, variant = 'collapsible', defaultOpen = false }) => {
    const [isCollapsed, setIsCollapsed] = useState(!defaultOpen);
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const scrollRef = useRef(null);
    const isFetchingRef = useRef(false);
    const prevDocumentStatusLengthRef = useRef(documentStatus.length);

    useEffect(() => {
        if (isFetchingRef.current && !loadingLogs) {
            // API call finished — check if new records were returned
            if (documentStatus.length === prevDocumentStatusLengthRef.current) {
                // No new records returned, stop further pagination
                isFetchingRef.current = false;
                return;
            }
            prevDocumentStatusLengthRef.current = documentStatus.length;
            isFetchingRef.current = false;
        }
    }, [loadingLogs, documentStatus.length]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !hasMore || loadingLogs || !getNextPage || isFetchingRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
            isFetchingRef.current = true;
            prevDocumentStatusLengthRef.current = documentStatus.length;
            getNextPage();
        }
    }, [hasMore, loadingLogs, getNextPage, documentStatus.length]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || isCollapsed) return;
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isCollapsed, handleScroll]);

    if (variant === 'flat') {
        return <FlatActivityList marginBottom={ marginBottom } documentStatus={ documentStatus } />;
    }

    return (
        <div className={ `${ marginBottom } activity-status-collapsible collapse-view` }>
            <div className="card bg-f7">
                <div className="card-header border-0 fz20 fw-500 black d-flex justify-content-between align-items-center" onClick={ toggleCollapse }>
                    <span>{ translation('key_activity') }</span>
                    <span>
                        { isCollapsed ? (
                            <i className="ri-arrow-down-s-line"></i>
                        ) : (
                            <i className="ri-arrow-up-s-line"></i>
                        ) }
                    </span>
                </div>

                <div ref={ scrollRef } className={ `card-body collapsible-activity-body pb-0 border-0 activity-scroll-container ${ isCollapsed ? "collapse" : "" }` }>
                    { Array.isArray(documentStatus) && documentStatus.length > 0 &&
                        documentStatus?.map((tab, index) => (
                            <div key={ index }>
                                { (tab?.current_status == "in_complete" || tab?.current_status == "In complete") ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ crossCircleLight } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-danger">
                                                    { translation('key_not_submitted') }
                                                </span>
                                                <span className="fz14 fw-400 grey3">

                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { (tab?.current_status == "Incomplete") ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ crossCircleLight } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-danger">
                                                    { translation('key_incomplete') }
                                                </span>
                                                <span className="fz14 fw-400 grey3">

                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { (tab?.current_status == "action_required" || tab?.current_status == "Action required") ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ actionCircle } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-purple">   { translation('key_action_required') }</span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    : ""
                                }

                                { (tab?.current_status == "in_review" || tab?.current_status == "In review") ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ crossCircleBlue } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto blue lh-normal mb4">   { translation('key_in_review') }</span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { (tab?.current_status == "verified" || tab?.current_status == "Verified") ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="d-flex align-items-start">
                                            <img src={ verifiedCircleGreen } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-success">
                                                    { translation('key_verified') }
                                                </span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { tab?.current_status == "Active" ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="d-flex align-items-start">
                                            <img src={ verifiedCircleGreen } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-success">
                                                    { translation('key_active') }
                                                </span>
                                                <span className="fz16 font-roboto lh-normal mb4 ">
                                                    { tab?.message }
                                                </span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { tab?.current_status == "Submitted" ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ crossCircleBlue } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto blue lh-normal mb4">   { translation('key_submitted') }</span>
                                                <span className="fz16 font-roboto lh-normal mb4">   { tab?.message }</span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                                { tab?.current_status == "Add Coverage" ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ actionCircle } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-purple">   { translation('key_add_coverage') }</span>
                                                <span className="fz16 font-roboto lh-normal mb4">   { tab?.message }</span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    : ""
                                }

                                { tab?.current_status == "Endorsement" ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="activity-wrap d-flex align-items-start">
                                            <img src={ actionCircle } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-purple">   { translation('key_endorsement') }</span>
                                                <span className="fz16 font-roboto lh-normal mb4">   { tab?.message }</span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    : ""
                                }

                                { tab?.current_status == "Renewal" ?

                                    <div className="activity-item mb40 position-relative">
                                        <div className="d-flex align-items-start">
                                            <img src={ verifiedCircleGreen } />
                                            <div className="d-flex flex-column align-items-start ml5">
                                                <span className="fz16 font-roboto lh-normal mb4 text-success">
                                                    { translation('key_renewal') }
                                                </span>
                                                <span className="fz16 font-roboto lh-normal mb4 ">
                                                    { tab?.message }
                                                </span>
                                                <span className="fz14 fw-400 grey3">
                                                    { normalizeActorName(tab?.log_created_by) },
                                                    { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    : ""
                                }

                            </div>
                        ))
                    }

                    { hasMore && <div style={ { padding: '10px', textAlign: 'center' } }>
                        { loadingLogs && <span className="fz14 grey3"><CustomSpinner /></span> }
                    </div> }

                </div>
            </div>
        </div>
    );
};
ActivityStatusCollapsible.propTypes = {
    marginBottom: PropTypes.string,
    documentStatus: PropTypes.any,
    getNextPage: PropTypes.func,
    hasMore: PropTypes.bool,
    loadingLogs: PropTypes.bool,
    variant: PropTypes.oneOf(['collapsible', 'flat']),
    defaultOpen: PropTypes.bool,
};
export default ActivityStatusCollapsible;
