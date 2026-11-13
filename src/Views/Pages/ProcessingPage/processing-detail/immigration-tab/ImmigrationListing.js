import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import CircularSpinner from "../../../../../components/ReusableComponents/CircularSpinner";
import pdfIcon from "../../../../../assets/img/svg/pdf-red.svg";
import docIcon from "../../../../../assets/img/svg/doc-icon.svg";
import { Cell, CheckCell, Listing, ListingRow, UpCell } from "../../../../../components/Processing/newui/StagePanel";
import { countsTowardReady, isImmigrationRowDone } from "../../processing-documents/immigrationRequirementOptions";

/* canonical listing columns (prototype immigrationPanel): Uploaded | Prepared | Ready */
export const IMM_COLUMNS = Object.freeze([{ key: "up", label: translation("key_uploaded") }, { key: "prep", label: translation("key_prepared") }, { key: "ready", label: translation("key_ready") }]);
/* the same columns with the sign-off reason as the header tooltip of a read-only column */
export const immColumns = (titles = {}) => IMM_COLUMNS.map((c) => (c.key === "prep" ? { ...c, title: titles.prepared } : c.key === "ready" ? { ...c, title: titles.ready } : c));

/** "done / total" over the rows that count toward Ready to Submit (case-only and optional rows are listed, never counted) */
export const immigrationProgress = (rows) => {
    const counted = rows.filter(countsTowardReady);
    return { done: counted.filter(isImmigrationRowDone).length, total: counted.length };
};

/**
 * One Immigration requirement row (checklist contract 22 Oct 2026): the system-form opener (PDF for the ImmD forms, document
 * glyph when a file is linked), the label with its small print and the case-only tag, then Uploaded (read-only; a physical
 * original shows an em dash), Prepared and Ready (Ready needs Prepared; clearing Prepared clears Ready).
 */
export const ImmigrationRows = ({ rows, canTick, canPrepared, canReady, onTick, onOpen }) => rows.map((row) => {
    /* sign-off (CHANGE_HISTORY 252): each column follows its own register; `canTick` is the legacy single gate */
    const mayPrepare = canPrepared ?? canTick;
    const mayReady = canReady ?? canTick;
    const opensPdf = Boolean(onOpen) && Boolean(row.key);
    let icon = null;
    if (row.isPdfLoading) icon = <CircularSpinner paddingClass="p-0" />;
    else if (opensPdf) icon = <button type="button" className="g1-ico-btn" aria-label={ `${ translation("key_download") } ${ row.label }` } onClick={ () => onOpen(row) }><img src={ pdfIcon } alt="" /></button>;
    else if (row.isDoc) icon = <img className="g1-row-ico" src={ docIcon } alt="" />;
    const name = row.caseOnly ? <>{ row.label } <span className="g1-tag gray">{ translation("key_case_only") }</span></> : row.label;
    return (
        <ListingRow key={ row.requirementKey } name={ name } sub={ row.sub || undefined } icon={ icon }>
            { row.physical
                ? <Cell><span className="g1-up dash" title={ translation("key_physical_original_no_upload") }>—</span></Cell>
                : <UpCell value={ row.uploaded } /> }
            <CheckCell checked={ Boolean(row.prepared) } disabled={ !mayPrepare } label={ `${ row.label } — ${ translation("key_prepared") }` } onChange={ (v) => onTick(row, "prepared", v) } />
            <CheckCell checked={ Boolean(row.ready) } disabled={ !mayReady || !row.prepared } label={ `${ row.label } — ${ translation("key_ready") }` } onChange={ (v) => onTick(row, "ready", v) } />
        </ListingRow>
    );
});
ImmigrationRows.propTypes = { rows: PropTypes.array.isRequired, canTick: PropTypes.bool, canPrepared: PropTypes.bool, canReady: PropTypes.bool, onTick: PropTypes.func.isRequired, onOpen: PropTypes.func };

/** A titled requirement group with its "done / total" count over the counted rows. */
const ImmigrationListing = ({ title, rows, canTick, canPrepared, canReady, columnTitles, onTick, onOpen }) => {
    const { done, total } = immigrationProgress(rows);
    return (
        <Listing title={ title } done={ done } total={ total } columns={ columnTitles ? immColumns(columnTitles) : IMM_COLUMNS }>
            <ImmigrationRows rows={ rows } canTick={ canTick } canPrepared={ canPrepared } canReady={ canReady } onTick={ onTick } onOpen={ onOpen } />
        </Listing>
    );
};
ImmigrationListing.propTypes = {
    title: PropTypes.node.isRequired, rows: PropTypes.array.isRequired, canTick: PropTypes.bool, canPrepared: PropTypes.bool, canReady: PropTypes.bool,
    columnTitles: PropTypes.shape({ prepared: PropTypes.string, ready: PropTypes.string }), onTick: PropTypes.func.isRequired, onOpen: PropTypes.func,
};

export default ImmigrationListing;
