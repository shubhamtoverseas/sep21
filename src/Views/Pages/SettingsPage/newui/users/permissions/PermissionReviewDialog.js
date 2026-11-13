import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../../components/ui/Modal";
import { PERM_COPY_KEYS, t } from "./permissionCatalogue";
import { buildReview } from "./permissionStructure";

/*
 * "Review changes" (before Save) and "Review copied permissions" (before Apply): the exact stored changes per module and
 * section, then the knock-on effects — settings that become available or unavailable through their requirements.
 * Nothing is saved from here; the caller decides what the primary button does.
 */
const PermissionReviewDialog = ({ title, engine, rows, bindingOf, audience, diffs, who, lead, kept, extra, footer, onClose, busy }) => {
    const review = useMemo(() => buildReview({ engine, rows, diffs, audience, bindingOf }), [engine, rows, diffs, audience, bindingOf]);
    return (
        <Modal title={ title } width={ 640 } onClose={ onClose } closeLabel={ t(PERM_COPY_KEYS.close) } busy={ busy } className="upm upm-dlg" footer={ footer }>
            <p className="rv-who">{ t(PERM_COPY_KEYS.reviewFor) } <b>{ who.name }</b> · { who.type }</p>
            { lead }
            { kept && <p className="rv-kept">{ t(PERM_COPY_KEYS.copyKept) }</p> }
            { review.length === 0 && <p className="rv-none">{ t(PERM_COPY_KEYS.noChange) }</p> }
            { review.map((m) => (
                <section key={ m.module } className="rv-mod">
                    <h3>{ m.name }</h3>
                    { m.sections.map((s) => (
                        <div key={ s.id } className="rv-sec">
                            <h4>{ s.title }</h4>
                            { s.rows.map((row) => (
                                <div key={ row.key } className="rv-row" data-key={ row.key }>
                                    <div><span className="rv-l">{ row.name }</span>{ row.group && <span className="rv-g">{ row.group }</span> }</div>
                                    <div className="rv-v">{ row.before } → { row.after }</div>
                                    { row.note && <span className="rv-x">{ row.note }</span> }
                                </div>
                            )) }
                            { s.effects.map((fx) => (
                                <div key={ fx.heading } className="rv-fx">
                                    <p className="rv-fx-h">{ fx.heading }</p>
                                    { fx.groups.map((g) => <p key={ g.keys.join(" ") } className="rv-fx-g">{ g.group && <span className="rv-g">{ g.group }</span> }{ g.text }</p>) }
                                </div>
                            )) }
                        </div>
                    )) }
                </section>
            )) }
            { extra }
        </Modal>
    );
};

PermissionReviewDialog.propTypes = {
    title: PropTypes.node.isRequired,
    engine: PropTypes.object.isRequired,
    rows: PropTypes.array.isRequired,
    bindingOf: PropTypes.func.isRequired,
    audience: PropTypes.string.isRequired,
    diffs: PropTypes.array.isRequired,
    who: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
    lead: PropTypes.node,
    kept: PropTypes.bool,
    extra: PropTypes.node,
    footer: PropTypes.node.isRequired,
    onClose: PropTypes.func.isRequired,
    busy: PropTypes.bool,
};

export default PermissionReviewDialog;
