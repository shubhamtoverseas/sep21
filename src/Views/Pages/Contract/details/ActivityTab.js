import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { caseRoute } from "../extend-visa/extendVisaUtils";
import FilterSelect from "../../../../components/ui/FilterSelect";
import translation from "../../../../utils/translation";
import { normalizeActorName } from "../../../../utils/utils";
import { getProcessingActivityLogList } from "../../../../services/processings";
import { EM_DASH, activityDotTone, dateOrDash, formatTime, groupByDay, isoOf, todayIso } from "./contractRecordUtils";
import dayjs from "../../../../utils/dayjsConfig";
import { CR_ACTIVITY_ALL_ACTORS, CR_ACTIVITY_PAGE_LIMIT, CR_ACTIVITY_RANGES } from "../contractConstants";

/**
 * Activity tab (prototype activityHTML): "Recent activity" with the Actor and Date range filters (options derived from
 * the record's own log), entries grouped by day, most recent first. Filtering is server-side
 * (POST /processing-activity-log-list { contract_id, actor_id, from_date, to_date }).
 */
const ActivityTab = ({ contractId }) => {
    const [actor, setActor] = useState(CR_ACTIVITY_ALL_ACTORS);
    const [range, setRange] = useState(CR_ACTIVITY_RANGES[0].value);
    const [entries, setEntries] = useState(null);
    const [actors, setActors] = useState([]);

    useEffect(() => {
        let alive = true;
        const body = { contract_id: Number(contractId), page: 1, limit: CR_ACTIVITY_PAGE_LIMIT };
        if (actor !== CR_ACTIVITY_ALL_ACTORS) body.actor_id = Number(actor);
        if (range !== CR_ACTIVITY_RANGES[0].value) { body.from_date = isoOf(dayjs().subtract(Number(range), "day")); body.to_date = todayIso(); }
        setEntries(null);
        getProcessingActivityLogList(body)
            .then((res) => {
                if (!alive) return;
                const d = res?.data?.data;
                const list = Array.isArray(d) ? d : Object.values(d?.logs || {}).flat();
                setEntries(list);
                if (actor === CR_ACTIVITY_ALL_ACTORS && range === CR_ACTIVITY_RANGES[0].value) {
                    const seen = new Map();
                    list.forEach((a) => { if (a.log_created_by_id && a.log_created_by) seen.set(String(a.log_created_by_id), a.log_created_by); });
                    setActors([...seen.entries()].map(([id, name]) => ({ value: id, label: name })));
                }
            })
            .catch(() => { if (alive) setEntries([]); });
        return () => { alive = false; };
    }, [contractId, actor, range]);

    const groups = useMemo(() => groupByDay(entries), [entries]);
    const actorOptions = useMemo(() => [{ value: CR_ACTIVITY_ALL_ACTORS, label: translation("key_all") }, ...actors], [actors]);
    const rangeOptions = useMemo(() => CR_ACTIVITY_RANGES.map((r) => ({ value: r.value, label: translation(r.labelKey) })), []);

    return (
        <div className="mcdt-dcard mcdt-act">
            <div className="ah">
                <span className="t">{ translation("key_recent_activity") }</span>
                <span className="s">{ translation("key_cr_activity_subtitle") }</span>
                <div className="f">
                    <FilterSelect id="cr-act-actor" className="mcdt-actsel" label={ translation("key_actor") } value={ actor } options={ actorOptions } onChange={ (v) => setActor(String(v)) } />
                    <FilterSelect id="cr-act-range" className="mcdt-actsel" label={ translation("key_date_range") } value={ range } options={ rangeOptions } onChange={ (v) => setRange(String(v)) } />
                </div>
            </div>
            <div className="ab">
                { entries === null && <div className="mcdt-note">{ translation("key_loading") }…</div> }
                { entries !== null && !groups.length && <div className="mcdt-empty">{ translation("key_cr_no_activity") }</div> }
                { groups.map((g) => (
                    <div key={ g.day } className="ag">
                        <div className="ad mono">{ dateOrDash(g.day) }</div>
                        <div className="al">
                            { g.items.map((a, i) => (
                                <div key={ `${ g.day }-${ i }` } className="ai">
                                    <span className={ `dot ${ activityDotTone(a) }` } />
                                    <div>
                                        <div className="m">
                                            { a.message || a.heading }
                                            { (a.extend_visa_case_id || a.json_data?.extend_visa_case_id) && (
                                                <Link className="xvlink" to={ caseRoute(contractId, a.extend_visa_case_id || a.json_data.extend_visa_case_id) }>{ translation("key_cr_xv_case") }</Link>
                                            ) }
                                        </div>
                                        <div className="b">{ translation("key_by").toLowerCase() } <b>{ normalizeActorName(a.log_created_by) || EM_DASH }</b> <span className="r">{ a.log_created_by_role || "" }</span> · <span className="mono">{ formatTime(a.created_at) }</span></div>
                                    </div>
                                </div>
                            )) }
                        </div>
                    </div>
                )) }
            </div>
        </div>
    );
};

ActivityTab.propTypes = { contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

export default React.memo(ActivityTab);
