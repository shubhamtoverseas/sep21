import React, { useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import translation from '../../../utils/translation';
import aiIcon from '../../../assets/img/svg/ai.svg';
import RegenerateCopyDialog from './RegenerateCopyDialog';
import CopyVersionsDialog from './CopyVersionsDialog';
import { COPY_LIMITS, ORIGIN_LABEL_KEYS, codePointLength } from './copyGeneratorConfig';
import './job-offer-copy.css';

const LANGUAGES = [
    { key: 'en', nameKey: 'key_english', tagKey: 'key_worker_facing', tagClass: 'jocopy-pub', lang: 'en' },
    { key: 'id', nameKey: 'key_bahasa_indonesia', tagKey: 'key_worker_facing_authoritative', tagClass: 'jocopy-pub', lang: 'id' },
    { key: 'zh', nameKey: 'key_traditional_chinese_review_aid', tagKey: 'key_internal_not_shown_to_workers', tagClass: '', lang: 'zh-Hant' },
];

const Spinner = () => (
    <svg className="jocopy-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

/* a saved package (D-09) carries no Chinese review aid: the ZH card appears only when the service returned one */
const LanguageCards = ({ version, muted }) => (
    <div className={`jocopy-pkg ${muted ? 'jocopy-muted' : ''}`}>
        {LANGUAGES.filter(({ key }) => key !== 'zh' || version.text.zh?.description).map(({ key, nameKey, tagKey, tagClass, lang }) => {
            const [headlineMax, descriptionMax] = COPY_LIMITS[key];
            const text = version.text[key];
            return (
                <div className={`jocopy-langcard ${key === 'zh' ? 'jocopy-aid' : ''}`} data-language={key} key={key}>
                    <div className="jocopy-langhd">
                        <span className="jocopy-langname">{translation(nameKey)}</span>
                        <span className={`jocopy-langtag ${tagClass}`}>{translation(tagKey)}</span>
                        <span className="jocopy-langsync">
                            { /* prototype languageCard: a padlock precedes the read-only tag */ }
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                            {`${translation('key_read_only')} · ${translation('key_version')} ${version.number}`}
                        </span>
                    </div>
                    <div className="jocopy-copyhead" lang={lang}>{text.headline}</div>
                    <div className="jocopy-copybody" lang={lang}>{text.description}</div>
                    <div className="jocopy-copymeta">
                        <span>{`${translation('key_headline')} ${codePointLength(text.headline)} / ${headlineMax}`}</span>
                        <span>{`${translation('key_description')} ${codePointLength(text.description)} / ${descriptionMax}`}</span>
                    </div>
                </div>
            );
        })}
    </div>
);

LanguageCards.propTypes = {
    version: PropTypes.object.isRequired,
    muted: PropTypes.bool,
};

/* The card chrome and eyebrow belong to the host card (JobOfferForm). The placeholder wording is the prototype's. */
function JobOfferCopySection({ copy, placeholderTitle, placeholderText, placeholderExtra = null, onSaveDraftAndClose }) {
    const {
        copyState, versions, currentVersion, currentHash, pending, failure,
        regenerate, restore, retry, dismissFailure,
    } = copy;
    const [isRegenOpen, setIsRegenOpen] = useState(false);
    const [isVersionsOpen, setIsVersionsOpen] = useState(false);
    const completedCount = versions.filter((version) => version.state === 'COMPLETE').length;
    const busy = copyState === 'pending';

    return (
        <div className="jocopy">
            {failure && (
                <div className="jocopy-failpanel" role="alert">
                    { /* the heading names what failed (prototype outcomePanel): generate vs regenerate */ }
                    <div className="jocopy-failhead">{translation(failure.kind === 'generate' ? 'key_copy_could_not_be_generated' : 'key_copy_could_not_be_regenerated')}</div>
                    <div className="jocopy-faildetail">
                        {failure.kind === 'generate'
                            ? translation('key_copy_generate_failed_detail')
                            : translation('key_copy_regenerate_failed_detail').replace('{n}', currentVersion?.number)}
                    </div>
                    <div className="jocopy-failacts">
                        { /* both prototypes: Retry is a plain button, not the filled primary */ }
                        <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={retry}>
                            {translation('key_jo_editor_retry_generation')}
                        </button>
                        {onSaveDraftAndClose ? (
                            <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={() => { dismissFailure(); onSaveDraftAndClose(); }}>
                                {translation('key_jo_editor_save_draft_and_close')}
                            </button>
                        ) : (
                            <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={dismissFailure}>
                                {translation('key_dismiss')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {copyState === 'review' && (
                <div className="jocopy-reviewnotice" role="status">
                    <span className="jocopy-noticetext">{translation('key_jo_copy_changed_regenerate')}</span>
                    <span className="jocopy-noticeacts">
                        <button type="button" className="btn filled-btn jocopy-btn-sm" onClick={() => setIsRegenOpen(true)}>
                            {translation('key_regenerate')}
                        </button>
                    </span>
                </div>
            )}

            {busy && (
                <div className="jocopy-genpanel" role="status" aria-live="polite">
                    <div className="jocopy-genhead">
                        <Spinner />
                        <div className="jocopy-gentitle">
                            {translation(pending.kind === 'generate' ? 'key_generating_headline_and_desc' : 'key_regenerating_headline_and_desc')}
                        </div>
                    </div>
                    <div className="jocopy-gentext">
                        {currentVersion
                            ? translation('key_version_stays_until_new_package').replace('{n}', currentVersion.number)
                            : translation('key_saved_details_stay_in_place')}
                        {` ${translation('key_duplicate_requests_unavailable')}`}
                    </div>
                </div>
            )}

            {copyState === 'none' && !busy && (
                <div className="jocopy-genpanel" data-testid="jocopy-placeholder">
                    <div className="jocopy-genhead">
                        <img src={aiIcon} width={18} height={18} alt="" />
                        <div className="jocopy-gentitle">{placeholderTitle}</div>
                    </div>
                    <div className="jocopy-gentext">{placeholderText}</div>
                    { /* prototype .genpanel: the field chips and the note live INSIDE the dashed panel */ }
                    {placeholderExtra}
                </div>
            )}

            {currentVersion && !busy && (
                <>
                    <div className="jocopy-roundbar">
                        <span className="jocopy-roundtag">{`${translation('key_version')} ${currentVersion.number}`}</span>
                        <span className="jocopy-roundhint">
                            {`${translation(ORIGIN_LABEL_KEYS[currentVersion.origin])} ${dayjs(currentVersion.at).format('DD MMM YYYY · HH:mm')} · ${copyState === 'ready'
                                ? translation('key_synchronized_with_current_details')
                                : translation('key_not_synchronized_with_current_details')}`}
                        </span>
                        <span className="jocopy-roundacts">
                            { /* prototype: Versions hides while a failure panel is up, like Regenerate */ }
                            {!failure && (
                                <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={() => setIsVersionsOpen(true)}>
                                    {`${translation('key_versions')} (${completedCount})`}
                                </button>
                            )}
                            {copyState === 'ready' && !failure && (
                                <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={() => setIsRegenOpen(true)}>
                                    {translation('key_regenerate')}
                                </button>
                            )}
                        </span>
                    </div>
                    <LanguageCards version={currentVersion} />
                    <div className="jocopy-pkgnote">{translation('key_one_package_note')}</div>
                </>
            )}

            {busy && currentVersion && (
                <div className="mt-3">
                    <LanguageCards version={currentVersion} muted />
                </div>
            )}

            {isRegenOpen && (
                <RegenerateCopyDialog
                    currentVersionNumber={currentVersion?.number}
                    onCancel={() => setIsRegenOpen(false)}
                    onRegenerate={(instruction, why) => {
                        setIsRegenOpen(false);
                        regenerate(instruction, why);
                    }}
                />
            )}

            {isVersionsOpen && (
                <CopyVersionsDialog
                    versions={versions}
                    currentId={currentVersion?.id}
                    currentHash={currentHash}
                    busy={busy}
                    onRestore={(versionId) => {
                        setIsVersionsOpen(false);
                        restore(versionId);
                    }}
                    onClose={() => setIsVersionsOpen(false)}
                />
            )}
        </div>
    );
}

JobOfferCopySection.propTypes = {
    copy: PropTypes.object.isRequired,
    placeholderTitle: PropTypes.node,
    placeholderText: PropTypes.node,
    placeholderExtra: PropTypes.node,
    /* failure panel second action: "Save as Draft and close" */
    onSaveDraftAndClose: PropTypes.func,
};

export default JobOfferCopySection;
