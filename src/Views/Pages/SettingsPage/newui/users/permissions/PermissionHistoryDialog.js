import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import { fetchPermissionHistory } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import translation from "../../../../../../utils/translation";
import { PERM_COPY_KEYS, PERM_SAVE, t } from "./permissionCatalogue";
import { formatStored, formatWhen, groupByVersion, keyIndex, labelForKey, sourceLabel } from "./permissionHistory";

/*
 * "View permission change history" (backend 263, AT-035): the account's stored events, newest first, one group per save
 * (version · time · actor · source · n changes), each row Control · Old → New. Read-only, paged with Load more.
 */
const PermissionHistoryDialog = ({ staffId, rows, bindingOf, audience, template, who, onClose }) => {
    const dispatch = useDispatch();
    const [events, setEvents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const index = useMemo(() => keyIndex(rows, bindingOf, audience), [rows, bindingOf, audience]);

    const loadPage = useCallback(async (next) => {
        setBusy(true);
        const res = await dispatch(fetchPermissionHistory({ staff_id: staffId, page: next, per_page: PERM_SAVE.HISTORY_PER_PAGE }));
        setBusy(false);
        if (res?.error || !res?.payload?.status) { setFailed(true); return; }
        setEvents((e) => (next === 1 ? res.payload.data || [] : [...e, ...(res.payload.data || [])]));
        setTotal(Number(res.payload.total) || 0);
        setPage(next);
    }, [dispatch, staffId]);
    useEffect(() => { loadPage(1); }, [loadPage]);

    const groups = useMemo(() => groupByVersion(events), [events]);
    const more = events.length < total;
    return (
        <Modal title={ t(PERM_COPY_KEYS.historyTitle) } width={ 640 } onClose={ onClose } closeLabel={ t(PERM_COPY_KEYS.close) } className="upm upm-dlg"
            footer={ <><span className="grow" /><Btn variant="secondary" type="button" onClick={ onClose }>{ t(PERM_COPY_KEYS.close) }</Btn></> }>
            <p className="rv-who">{ t(PERM_COPY_KEYS.reviewFor) } <b>{ who.name }</b> · { who.type }</p>
            { failed && <p className="rv-none">{ translation("key_something_went_wrong") }</p> }
            { !failed && !busy && events.length === 0 && <p className="rv-none">{ t(PERM_COPY_KEYS.historyEmpty) }</p> }
            { groups.map((g) => (
                <section key={ `${ g.version }-${ g.at }` } className="rv-mod" data-version={ g.version }>
                    <h3>{ formatWhen(g.at) } · { g.actor } · { sourceLabel(g.source) } · { g.items.length === 1 ? t(PERM_COPY_KEYS.historyChangeOne) : t(PERM_COPY_KEYS.historyChanges, { n: g.items.length }) }</h3>
                    { g.items.map((e) => (
                        <div key={ e.id ?? `${ e.key_value }-${ e.created_at }` } className="rv-row" data-key={ e.key_value }>
                            <div><span className="rv-l">{ labelForKey(e.key_value, index) }</span></div>
                            <div className="rv-v">{ formatStored(e.key_value, e.old_value, index, template) } → { formatStored(e.key_value, e.new_value, index, template) }</div>
                        </div>
                    )) }
                </section>
            )) }
            { busy && <p className="rv-none">{ translation("key_loading") }…</p> }
            { more && !busy && <p className="rv-none"><button type="button" className="upm-linkbtn" onClick={ () => loadPage(page + 1) }>{ t(PERM_COPY_KEYS.historyLoadMore) }</button></p> }
        </Modal>
    );
};

PermissionHistoryDialog.propTypes = {
    staffId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    rows: PropTypes.array.isRequired,
    bindingOf: PropTypes.func.isRequired,
    audience: PropTypes.string.isRequired,
    template: PropTypes.object,
    who: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default PermissionHistoryDialog;
