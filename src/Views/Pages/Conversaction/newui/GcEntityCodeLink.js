import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import translation from "../../../../utils/translation";
import { gcDetailsPath, gcCanOpenDetails } from "./gcHelpers";


const GcEntityCodeLink = ({ kind, id, code, titleKey, jobOfferId }) => {
    const navigate = useNavigate();
    const permissionList = useSelector((state) => state.users.permissionList);
    const canOpen = gcCanOpenDetails(kind, permissionList);
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        const path = gcDetailsPath(kind, id, { jobOfferId });
        if (path) navigate(path);
    }, [kind, id, jobOfferId, navigate]);

    if (!code) return null;
    if (!id || !canOpen) return <span className="gc-ecl-neutral">{ code }</span>;
    return (
        <button
            type="button"
            className="gc-ecl"
            title={ titleKey ? translation(titleKey) : undefined }
            onClick={ handleClick }
        >
            { code }
        </button>
    );
};

GcEntityCodeLink.propTypes = {
    kind: PropTypes.oneOf(["worker", "employer"]).isRequired,
    id: PropTypes.any,
    code: PropTypes.string,
    titleKey: PropTypes.string,
    jobOfferId: PropTypes.any,
};

export default React.memo(GcEntityCodeLink);
