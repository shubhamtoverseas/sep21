import React from "react";
import PropTypes from "prop-types";
import { useEmbedded } from "./EmbeddedContext";
import { CD_STAGE_TONE_OVERRIDE, CD_TOKEN, CD_TOKEN_BLUE, CD_TOKEN_GRAY, CD_TOKEN_PURPLE, CD_TOKEN_TEAL, CD_TONE, CR_STAGE_TERMINAL_TOKEN, CR_STATUS_TOKEN, normalizeToken } from "../../Views/Pages/Contract/contractConstants";

const titleCase = (s) => String(s || "").split("_").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/* one stage token map (PROCESS "Stage status vocabulary", prototype VOCAB / TERMINAL / tones): stored id → token → tone */
export const stageToken = (stage, status, labelOverride) => {
    const label = normalizeToken(labelOverride || (status ? (CR_STATUS_TOKEN[String(status)] || titleCase(status)) : CD_TOKEN.NOT_READY));
    let tone = CD_TONE.ORANGE;
    if (label === CD_TOKEN.NOT_READY) tone = CD_TONE.RED;
    else if (CD_TOKEN_GRAY.includes(label)) tone = CD_TONE.GRAY;
    else if (CR_STAGE_TERMINAL_TOKEN[stage] === label || label === CD_TOKEN.READY || label === CD_TOKEN.COMPLETED || label === CD_TOKEN.POLICY_CONFIRMED) tone = CD_TONE.GREEN;
    else if (CD_STAGE_TONE_OVERRIDE[stage]?.[label]) tone = CD_STAGE_TONE_OVERRIDE[stage][label];
    else if (CD_TOKEN_PURPLE.includes(label)) tone = CD_TONE.PURPLE;
    else if (CD_TOKEN_BLUE.includes(label)) tone = CD_TONE.BLUE;
    else if (CD_TOKEN_TEAL.includes(label)) tone = CD_TONE.TEAL;
    return { label, tone };
};

const pad = (n) => String(n).padStart(2, "0");
const shortName = (name) => { const p = String(name || "").trim().split(/\s+/); return p.length > 1 ? `${ p[0] } ${ p[p.length - 1][0] }.` : p[0] || ""; };
const metaText = (updatedAt, updatedBy) => {
    if (!updatedAt) return null;
    const d = new Date(updatedAt); if (Number.isNaN(d.getTime())) return null;
    return `Last updated ${ pad(d.getDate()) }/${ pad(d.getMonth() + 1) }/${ String(d.getFullYear()).slice(2) } at ${ pad(d.getHours()) }:${ pad(d.getMinutes()) }${ updatedBy ? ` by ${ shortName(updatedBy) }` : "" }`;
};

/**
 * Stage panel title. Outside the Contract record it is the Processing screen's 24px title (unchanged);
 * inside it, the prototype `g1-panel-head`: title · status tag · "Last updated … by …".
 */
const StageTitle = ({ title, stage, status, label, tone, updatedAt, updatedBy, legacyClassName = "black fz24 lh-28 fw-700 mb-0", children }) => {
    const embedded = useEmbedded();
    if (!embedded) return <p className={ legacyClassName }>{ title }</p>;
    const tok = stageToken(stage, status, label);
    const meta = metaText(updatedAt, updatedBy);
    return (
        <div className="mcdt-stagehead">
            <h2>{ title }</h2>
            <span className={ `mcdt-stagepill ${ tone || tok.tone }` }>● { tok.label }</span>
            { meta && <span className="mcdt-stagemeta">{ meta }</span> }
            { children }
        </div>
    );
};

StageTitle.propTypes = {
    title: PropTypes.node.isRequired,
    stage: PropTypes.string,
    status: PropTypes.string,
    label: PropTypes.string,
    tone: PropTypes.string,
    updatedAt: PropTypes.string,
    updatedBy: PropTypes.string,
    legacyClassName: PropTypes.string,
    children: PropTypes.node,
};

export default StageTitle;
