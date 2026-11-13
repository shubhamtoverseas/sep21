import React from "react";
import PropTypes from "prop-types";

import "./common-content-container.css";

function CommonContentContainer({
    children,
    noPadding,
    noSpace,
    isMinHeight = true,
    isBoxShadow = true
}) {
    return (
        <section
            className={ `${ isMinHeight ? "centerContent" : "p24" } greyBg joboffer_Adminaccount ${ noSpace && "p-0" }` }
        >
            <div className="container-fluid">
                <div className={ `${ isBoxShadow ? "content-section" : "content-section-no-shadow" } grey ${ noPadding && "p-0" }` }>
                    { children }
                </div>
            </div>
        </section>
    );
}

CommonContentContainer.propTypes = {
    children: PropTypes.node.isRequired,
    noPadding: PropTypes.bool,
    noSpace: PropTypes.bool,
    isMinHeight: PropTypes.bool,
    isBoxShadow: PropTypes.bool
};

export default CommonContentContainer;