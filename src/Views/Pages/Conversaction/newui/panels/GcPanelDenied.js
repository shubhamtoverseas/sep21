import React from "react";
import GcIcon from "../gcIcons";
import { GC_PANEL_COPY } from "../gcConstants";

/* the neutral denial (prototype .denied): the same title and message for every record the actor may not open, naming no
   record fact — a panel level never renders empty */
const GcPanelDenied = () => (
    <div className="gc-denied" role="status" data-mc-denial="neutral">
        <span className="gc-d-ico"><GcIcon name="lock" /></span>
        <b>{ GC_PANEL_COPY.deniedTitle }</b>
        <p>{ GC_PANEL_COPY.deniedText }</p>
    </div>
);

export default React.memo(GcPanelDenied);
