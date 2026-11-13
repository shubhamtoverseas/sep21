import React, { useMemo, useCallback, memo } from 'react';
import PropTypes from 'prop-types';

import LegendCapsule from '../../../components/legend-capsule/LegendCapsule';

import userImg from '../../../assets/img/nouser.jpeg';
import userPlusBlue from '../../../assets/img/svg/user-plus-blue.svg';
import pinkUser from '../../../assets/img/svg/pink-user.svg';
import usersGreen from '../../../assets/img/svg/users-green.svg';
import blankPurpleCalendar from '../../../assets/img/svg/blank-purple-calendar.svg';
import crossLight from '../../../assets/img/svg/cross-light.svg';
import greenTickIcon from '../../../assets/img/svg/tick-mark.svg';
import calendar from '../../../assets/img/svg/calendar.svg';
import calendarTickOrange from '../../../assets/img/svg/calendar-tick-orange.svg';
import crossRed from '../../../assets/img/svg/cross-red.svg';

import configData from '../../../components/ReusableComponents/app-configs';
import constData, {
  workerNationalityList,
  workerTypeList,
} from '../../../components/ReusableComponents/constants';
import { getCurrentUser, timeSince } from '../../../services/commonService';
import { isOlderThanDays } from '../../../services/workerBiodataService';
import { resolveWorkerListVariant } from './workerListVariant';
import t from '../../../utils/translation';
import translation from "../../../utils/translation";


// ─── Shared row shape used by multiple components ─────────────────────────────
const workerRowShape = PropTypes.shape({
  invited_jobs_count: PropTypes.number,
  applied_jobs_count: PropTypes.number,
  matched_jobs_count: PropTypes.number,
  pending_jobs_count: PropTypes.number,
  upcoming_jobs_count: PropTypes.number,
  completed_jobs_count: PropTypes.number,
  cancelled_jobs_count: PropTypes.number,
  worker_status: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    worker_status: PropTypes.string,
  }),
  activity_status: PropTypes.string,
});

// ─── JobOfferStats ────────────────────────────────────────────────────────────
const JobOfferStats = memo(({ row, onClick = undefined }) => (
  <div className="d-flex justify-content-center" onClick={ onClick }>
    <LegendCapsule name="invited" img={ userPlusBlue } count={ row?.invited_jobs_count || 0 } />
    <LegendCapsule name="applied" img={ pinkUser } count={ row?.applied_jobs_count || 0 } />
    <LegendCapsule name="matched" img={ usersGreen } count={ row?.matched_jobs_count || 0 } />
    <LegendCapsule name="interview_pending" img={ blankPurpleCalendar } count={ row?.pending_jobs_count || 0 } />
    <LegendCapsule name="interview_upcoming" img={ calendar } count={ row?.upcoming_jobs_count || 0 } />
    <LegendCapsule name="interview_completed" img={ calendarTickOrange } count={ row?.completed_jobs_count || 0 } />
    <LegendCapsule name="cancelled" img={ crossRed } count={ row?.cancelled_jobs_count || 0 } />
  </div>
));
JobOfferStats.displayName = 'JobOfferStats';

JobOfferStats.propTypes = {
  row: workerRowShape.isRequired,
  onClick: PropTypes.func,
};

// ─── DocumentStatusCell ───────────────────────────────────────────────────────
function DocumentStatusCell({ status = 'in_complete', onClick = undefined, disabled = false }) {
  const labelName =
    configData.WorkerDocumentStatusNameMapping[status || 'in_complete'];

  const inner = labelName?.icon ? (
    <img loading="lazy" src={ labelName.icon } width={ 22 } alt="status-icon" />
  ) : (
    <span className={ labelName?.className }>{ labelName?.label }</span>
  );

  if (disabled) {
    return (
      <div className="doc-status-disabled">
        { inner }
      </div>
    );
  }

  return <div onClick={ onClick }>{ inner }</div>;
}

DocumentStatusCell.propTypes = {
  status: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
};


// ─── ProfileStatusChip ────────────────────────────────────────────────────────
const ProfileStatusChip = ({ row, onClick = undefined }) => (
  <span
    onClick={ onClick }
    className={ `btn chip small compact ${ configData.WorkerStatusNameMapping[row?.worker_status?.id]?.className ||
      'default-status'
      }` }
  >
    { row?.worker_status?.worker_status }
  </span>
);

ProfileStatusChip.propTypes = {
  row: PropTypes.shape({
    worker_status: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      worker_status: PropTypes.string,
    }),
  }).isRequired,
  onClick: PropTypes.func,
};

// ─── ActivityStatusChip ───────────────────────────────────────────────────────
const ActivityStatusChip = ({ row, onClick = undefined }) => (
  <span
    onClick={ onClick }
    className={ `btn chip text-capitalize small compact ${ row?.activity_status === 'active' ? 'available' : 'in-review'
      }` }
  >
    { row?.activity_status || translation('key_inactive') }
  </span>
);

ActivityStatusChip.propTypes = {
  row: PropTypes.shape({
    activity_status: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};

// ─── Column factory helpers ───────────────────────────────────────────────────

const makeProfileStatusCol = (navigate) => ({
  header: t('key_profile_status'),
  sortKey: 'status',
  render: (row) => <ProfileStatusChip row={ row } onClick={ () => navigate(row, '') } />,
});

const makeActivityStatusCol = (navigate) => ({
  header: t('key_activity_status'),
  sortKey: 'activity_status',
  render: (row) => <ActivityStatusChip row={ row } onClick={ () => navigate(row, '') } />,
});

const makeDaysAvailableCol = () => ({
  header: t('key_days_available'),
  sortKey: 'days_available',
  leftAlign: true,
  render: (row) => row?.days_available ?? 0,
});

const makeViewsCol = (leftAlign = false) => ({
  header: t('key_views'),
  sortKey: 'worker_views_count',
  leftAlign,
  render: (row) => row?.worker_views_count ?? 0,
});

const makeJobOfferStatsCol = (navigate, clickable = true) => ({
  header: t('key_job_offer_statistics'),
  sortKey: '',
  leftAlign: false,
  render: (row) => (
    <JobOfferStats
      row={ row }
      onClick={ clickable ? () => navigate(row, '') : undefined }
    />
  ),
});

const makePassportCol = (navigate, action = 'passport') => ({
  header: t('key_passport'),
  sortKey: 'passport_status',
  render: (row) => (
    <DocumentStatusCell
      status={ row?.worker_overseas_detail_info?.passport_status }
      onClick={ () => navigate(row, action) }
    />
  ),
});

const makeOverseasExpCol = () => ({
  header: t('key_overseas_exp'),
  sortKey: '',
  leftAlign: true,
  render: () => 0,
});

const makeUpdatedCol = (navigate) => ({
  header: t('key_updated'),
  sortKey: 'last_profile_updated_at',
  render: (row) => (
    <span onClick={ () => navigate(row, '') }>
      { row.last_profile_updated_at ? (
        timeSince(row?.last_profile_updated_at)
      ) : (
        <span className="text-danger">{ t('key_no_session') }</span>
      ) }
    </span>
  ),
});

const makeDelayCol = () => ({
  header: t('key_delay'),
  sortKey: 'worker_delay',
  render: (row) => <span>{ row?.worker_delay }</span>,
});

const makeBiodataCol = (navigate) => ({
  header: t('key_biodata'),
  sortKey: 'biodata_status',
  render: (row) => (
    <DocumentStatusCell
      status={ row?.biodata_status }
      onClick={ () => navigate(row, 'biodata') }
    />
  ),
});

const makePhotoCol = (navigate) => ({
  header: t('key_photo'),
  sortKey: 'image_status',
  render: (row) => (
    <DocumentStatusCell
      status={ row?.image_status }
      onClick={ () => navigate(row, 'photo') }
    />
  ),
});

const makeContractStatusCol = (navigate, clickable = false) => ({
  header: t('key_contract_status'),
  sortKey: 'contract_status',
  render: (row) => (
    <span onClick={ clickable ? () => navigate(row, '') : undefined }>
      { row.contract_status_info?.admin_panel_status }
    </span>
  ),
});

const makeContractVisaExpiryCol = (navigate) => ({
  header: t('key_contract_visa_expiry'),
  sortKey: 'contract_end_visa_expiry_date',
  render: (row) => {
    const isPast = isOlderThanDays(row?.contract_end_visa_expiry_date, 14);
    return (
      <span
        onClick={ () => navigate(row, '') }
        className={ isPast ? 'text-danger' : '' }
      >
        { row?.contract_end_visa_expiry_date }
      </span>
    );
  },
});

const makeOnboarding1Col = (key) => ({
  header: `${ t('key_onboarding') } 1`,
  sortKey: 'onboarding1',
  key,
  render: (row) => <span>{ row?.onboarding1_name }</span>,
});

const makeOnboarding2Col = (key) => ({
  header: `${ t('key_onboarding') } 2`,
  sortKey: 'onboarding2',
  key,
  render: (row) => <span>{ row?.onboarding2_name }</span>,
});

const makePhoneCol = () => ({
  header: t('key_phone'),
  hideSortIcon: true,
  render: (row) => (
    <>{ row?.mobile_number ? `${ row?.country_code } ${ row?.mobile_number }` : '' }</>
  ),
});

// ─── Shared dashboard-2 overseas/partner column set ──────────────────────────
const makeDashboard2CommonCols = (navigate, passportAction) => [
  makeProfileStatusCol(navigate),
  makeActivityStatusCol(navigate),
  makeDaysAvailableCol(),
  makeViewsCol(true),
  makeJobOfferStatsCol(navigate, true),
  makePassportCol(navigate, passportAction),
  makeOverseasExpCol(),
];

// ─── Philippine-specific dashboard_1 doc columns ─────────────────────────────
const makePhilippinesDocCols = (navigate) => [
  {
    header: t('key_e_registration'),
    sortKey: 'eregistration_status',
    render: (row) => (
      <DocumentStatusCell
        status={ row?.worker_overseas_detail_info?.eregistration_status }
        onClick={ () => navigate(row, 'eregistration') }
      />
    ),
  },
  {
    header: 'PEOS',
    sortKey: 'peos_certification_status',
    render: (row) => (
      <DocumentStatusCell
        status={ row?.worker_overseas_detail_info?.peos_certification_status }
        onClick={ () => navigate(row, 'peos-certificate') }
      />
    ),
  },
  {
    header: t('key_tesda') || 'TESDA',
    sortKey: 'tesda_status',
    render: (row) => (
      <DocumentStatusCell
        status={ row?.worker_overseas_detail_info?.tesda_status }
        onClick={ () => navigate(row, 'tesda') }
      />
    ),
  },
  {
    header: t('key_assign_partner'),
    sortKey: 'pt_assign_status',
    render: (row) => (
      <DocumentStatusCell
        status={ row?.worker_overseas_detail_info?.pt_assign_status }
        onClick={ () => navigate(row, 'assign-pt') }
      />
    ),
  },
];

// ─── Indonesian "Doc Upload" parent column ────────────────────────────────────
function makeIndonesianDocUploadCol(navigate, renderDoc) {
  return {
    header: t('key_doc_upload'),
    key: 'doc_upload',
    isParent: true,
    render: (row) => {
      const od = row.worker_overseas_detail_info;
      if (!od) return '-';
      const statuses = [
        od.passport_status,
        od.indonesian_id_status,
        od.birth_certificate_status,
        od.family_certificate_status,
        od.education_certificate_status,
      ];
      const verified = statuses.filter(
        (s) => s === 'verified' || s === 'completed'
      ).length;
      return (
        <img
          loading="lazy"
          width={ 22 }
          src={ verified > 0 ? greenTickIcon : crossLight }
          alt="doc-status"
        />
      );
    },
    children: [
      {
        header: t('key_passport'),
        key: 'passport_status',
        render: (row) => renderDoc(row, 'passport_status', 'passport'),
      },
      {
        header: t('key_indonesian_id'),
        key: 'indonesian_id_status',
        render: (row) => renderDoc(row, 'indonesian_id_status', 'indonesian-id'),
      },
      {
        header: t('key_birth_certificate') || t('key_birth_cert'),
        key: 'birth_certificate_status',
        render: (row) => renderDoc(row, 'birth_certificate_status', 'birth-certificate'),
      },
      {
        header: t('key_family_certificate') || t('key_family_cert'),
        key: 'family_certificate_status',
        render: (row) => renderDoc(row, 'family_certificate_status', 'family-certificate'),
      },
      {
        header: t('key_edication_certificate') || t('key_education_cert'),
        key: 'education_certificate_status',
        render: (row) => renderDoc(row, 'education_certificate_status', 'education-certificate'),
      },
    ],
  };
}

// ─── Indonesian "PT" parent column ────────────────────────────────────────────
function makeIndonesianPTCol(navigate, renderDoc) {
  return {
    header: t('PT'),
    key: 'pt_status',
    isParent: true,
    render: (row) => {
      const od = row.worker_overseas_detail_info;
      if (!od) return '-';
      const statuses = [
        od.medical_status,
        od.submit_document_status,
        od.training_certificate_status,
        od.labour_id_status,
      ];
      const verified = statuses.filter(
        (s) => s === 'verified' || s === 'completed'
      ).length;
      return (
        <img
          loading="lazy"
          src={ verified > 0 ? greenTickIcon : crossLight }
          alt="pt-status"
        />
      );
    },
    children: [
      {
        header: t('key_medical'),
        key: 'medical_status',
        render: (row) => renderDoc(row, 'medical_status', 'medical'),
      },
      {
        header: t('key_submit_document'),
        key: 'submit_documents_status',
        render: (row) => renderDoc(row, 'submit_document_status', 'submit-documents'),
      },
      {
        header: t('key_training_certificate') || t('key_training_cert'),
        key: 'training_certificate_status',
        render: (row) => renderDoc(row, 'training_certificate_status', 'training-certificate'),
      },
      {
        header: t('key_labour_id'),
        key: 'labour_id_status',
        isRegularColumn: false,
        render: (row) => renderDoc(row, 'labour_id_status', 'labor-id'),
      },
    ],
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WorkerTableColumns({
  fieldsToShow = [],
  nationality = null,
  type = null,
  activeDashboard = '',
  handleNavigate = () => { },
  staffType = '',
  staffCountryID = null,
}) {
  // Stable navigate wrapper
  const navigate = useCallback(
    (row, action) => {
      if (typeof handleNavigate === 'function') {
        handleNavigate(row, action);
      }
    },
    [handleNavigate]
  );

  // Stable renderDocumentStatus (used inside Indonesian column trees)
  const renderDocumentStatus = useCallback(
    (row, statusField, action) => {
      const isPartnerRestricted =
        (row.registration_type === 'partner_sent_link' ||
          row.registration_type === 'partner_added') &&
        [
          'passport',
          'indonesian-id',
          'birth-certificate',
          'family-certificate',
          'education-certificate',
        ].includes(action);

      return (
        <DocumentStatusCell
          status={ row?.worker_overseas_detail_info?.[statusField] }
          onClick={ () => navigate(row, action) }
          disabled={ isPartnerRestricted }
        />
      );
    },
    [navigate]
  );

  // Static worker-type / nationality IDs — computed once
  const { overseasId, localId, philId, indoId } = useMemo(() => {
    const overseas = workerTypeList().find((wt) => wt.key === 'overseas');
    const local = workerTypeList().find((wt) => wt.key === 'local');
    const phil = workerNationalityList().find((n) => n.key === 'philippines');
    const indo = workerNationalityList().find((n) => n.key === 'indonesia');
    return {
      overseasId: overseas?.id,
      localId: local?.id,
      philId: phil?.id,
      indoId: indo?.id,
    };
  }, []);

  // Nationality flags
  const { hasPhil, hasIndo } = useMemo(() => {
    if (staffType === 'partner') {
      return {
        /* eslint-disable eqeqeq */
        hasPhil: constData?.PARTNER_PHILIPPINES_COUNTRY_ID == staffCountryID,
        hasIndo: constData?.PARTNER_INDONESIAN_COUNTRY_ID == staffCountryID,
        /* eslint-enable eqeqeq */
      };
    }
    const natArr = Array.isArray(nationality) ? nationality : [nationality];
    return {
      hasPhil: type === overseasId && natArr.includes(philId),
      hasIndo: type === overseasId && natArr.includes(indoId),
    };
  }, [staffType, staffCountryID, nationality, type, overseasId, philId, indoId]);

  // Current-user country for conditional phone column
  const currentUserCountry = useMemo(
    () => getCurrentUser()?.data?.staff?.country_name,
    []
  );

  // Build the column array
  const allColumns = useMemo(() => {
    // ── Assign-PT column (reused in several branches) ────────────────────────
    const makeAssignPtCol = (renderDoc) => ({
      header: t('key_assign_pt'),
      key: 'pt_assign_status',
      sortKey: 'pt_assign_status',
      render: (row) => renderDoc(row, 'pt_assign_status', 'assign-pt'),
    });

    // ── Base column ──────────────────────────────────────────────────────────
    const workerNameCol = {
      header: t('key_worker_name'),
      sortKey: 'name',
      leftAlign: true,
      render: (row) => (
        <div onClick={ () => navigate(row, '') }>
          <div className="d-flex worker-page">
            <img
              loading="lazy"
              src={
                row?.image &&
                  (row?.image_status === 'verified' || row?.image_status === 'in_review')
                  ? row.image
                  : userImg
              }
              className="worker-img mr10"
              alt="worker"
              width={35}
              height={35}
            />
            <div className="text-left">
              <div className="fz14 fw-400 black worker-name">{ row.fullname }</div>
              <span className="mr12 grey3 fz12 fw-400">
                { row?.reference_id || t('key_not_assigned') }
              </span>
              <span className="grey3 fz12 fw-400">|</span>
              <span className="ml12 grey3 fz12 fw-400">
                { timeSince(row?.last_profile_updated_at) }
              </span>
            </div>
          </div>
        </div>
      ),
    };

    let cols = [workerNameCol];

    const variant = resolveWorkerListVariant({
      staffType,
      type,
      activeDashboard,
      localTypeId: localId,
      overseasTypeId: overseasId,
      hasPhilippinesNationality: hasPhil,
    });

    // ────────────────────────────────────────────────────────────────────────
    // PARTNER
    // ────────────────────────────────────────────────────────────────────────
    if (variant.startsWith('partner_')) {
      if (variant === 'partner_dashboard_2') {
        cols.push(...makeDashboard2CommonCols(navigate, 'passport-details'));

      } else if (variant === 'partner_dashboard_1') {
        cols.push(
          makeUpdatedCol(navigate),
          makeProfileStatusCol(navigate),
          makeDelayCol(),
          makeBiodataCol(navigate),
          makePhotoCol(navigate),
        );

        if (currentUserCountry === 'Philippines' || currentUserCountry === 'Indonesia') {
          cols.push(makePhoneCol());
        }

        cols.push(
          makeOnboarding1Col('overseas_dashboard2_onboarding1'),
          makeOnboarding2Col('overseas_dashboard2_onboarding2'),
        );

        const afterPhotoIdx =
          cols.findIndex((c) => c.sortKey === 'image_status') + 1;

        if (hasPhil) {
          cols = [
            ...cols.slice(0, afterPhotoIdx),
            ...makePhilippinesDocCols(navigate),
            ...cols.slice(afterPhotoIdx),
          ];
        }

        if (hasIndo) {
          const indoDocCol = makeIndonesianDocUploadCol(navigate, renderDocumentStatus);
          const indoPtCol = makeIndonesianPTCol(navigate, renderDocumentStatus);
          cols = [
            ...cols.slice(0, afterPhotoIdx),
            indoDocCol,
            makeAssignPtCol(renderDocumentStatus),
            indoPtCol,
            ...cols.slice(afterPhotoIdx),
          ];
        }

      } else if (
        variant === 'partner_dashboard_3' ||
        variant === 'partner_dashboard_4' ||
        variant === 'partner_dashboard_5'
      ) {
        cols.push(...makeDashboard2CommonCols(navigate, 'passport'));

      } else {
        // Default partner branch
        if (hasPhil) {
          cols.push(
            makeUpdatedCol(navigate),
            makeProfileStatusCol(navigate),
            makeDelayCol(),
            makeBiodataCol(navigate),
            makePhotoCol(navigate),
            {
              header: t('key_assign_partner'),
              sortKey: 'pt_assign_status',
              render: (row) => (
                <DocumentStatusCell
                  status={ row?.worker_overseas_detail_info?.pt_assign_status }
                  onClick={ () => navigate(row, 'assign-pt') }
                />
              ),
            },
            {
              header: t('key_PT'),
              sortKey: 'pt_status',
              render: (row) => (
                <DocumentStatusCell
                  status={ row?.worker_overseas_detail_info?.pt_status }
                  onClick={ () => navigate(row, 'pt') }
                />
              ),
            },
          );
        } else {
          cols.push(makeProfileStatusCol(navigate));
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // NON-PARTNER
      // ────────────────────────────────────────────────────────────────────────
    } else {
      if (variant === 'local_dashboard_2') {
        cols.push(
          makeProfileStatusCol(navigate),
          makeActivityStatusCol(navigate),
          makeDaysAvailableCol(),
          makeViewsCol(true),
          makeJobOfferStatsCol(navigate),
          makeContractStatusCol(navigate, true),
          makeContractVisaExpiryCol(navigate),
        );

      } else if (variant === 'overseas_dashboard_2') {
        if (hasPhil) {
          cols.push(...makeDashboard2CommonCols(navigate, 'passport-details'));
        } else {
          cols.push(
            makeProfileStatusCol(navigate),
            makeActivityStatusCol(navigate),
            makeDaysAvailableCol(),
            makeViewsCol(true),
            makeJobOfferStatsCol(navigate, false),
            makePassportCol(navigate, 'passport-details'),
            makeOverseasExpCol(),
          );
        }

      } else if (variant === 'local_dashboard_1') {
        cols.push(
          makeUpdatedCol(navigate),
          makeProfileStatusCol(navigate),
          makeDelayCol(),
          makeBiodataCol(navigate),
          makePhotoCol(navigate),
          makeContractStatusCol(navigate),
          makeContractVisaExpiryCol(navigate),
          makeOnboarding1Col('local_dashboard2_onboarding1'),
          makeOnboarding2Col('local_dashboard2_onboarding2'),
        );

      } else if (variant === 'overseas_dashboard_1') {
        cols.push(
          makeUpdatedCol(navigate),
          makeProfileStatusCol(navigate),
          makeDelayCol(),
          makeBiodataCol(navigate),
          makePhotoCol(navigate),
          makeOnboarding1Col('overseas_dashboard2_onboarding1'),
          makeOnboarding2Col('overseas_dashboard2_onboarding2'),
        );

        const afterPhotoIdx =
          cols.findIndex((c) => c.sortKey === 'image_status') + 1;

        if (hasPhil) {
          const philCols = [...makePhilippinesDocCols(navigate), makePhoneCol()];
          cols = [
            ...cols.slice(0, afterPhotoIdx),
            ...philCols,
            ...cols.slice(afterPhotoIdx),
          ];
        }

        if (hasIndo) {
          const indoDocCol = makeIndonesianDocUploadCol(navigate, renderDocumentStatus);
          indoDocCol.children.push(makePhoneCol());
          const indoPtCol = makeIndonesianPTCol(navigate, renderDocumentStatus);
          cols = [
            ...cols.slice(0, afterPhotoIdx),
            indoDocCol,
            makeAssignPtCol(renderDocumentStatus),
            indoPtCol,
            ...cols.slice(afterPhotoIdx),
          ];
        }

      } else if (variant === 'local_dashboard_3') {
        cols.push(
          makeProfileStatusCol(navigate),
          makeActivityStatusCol(navigate),
          makeDaysAvailableCol(),
          makeViewsCol(true),
          makeJobOfferStatsCol(navigate),
          makeContractStatusCol(navigate),
          {
            header: translation('key_contract_end_date'),
            sortKey: 'contract_end_visa_expiry_date',
            render: (row) => <span>{ row?.contract_end_visa_expiry_date }</span>,
          },
        );

      } else if (
        variant === 'local_dashboard_4' || variant === 'local_dashboard_5'
      ) {
        cols.push(
          makeUpdatedCol(navigate),
          makeProfileStatusCol(navigate),
          makeDelayCol(),
          makeBiodataCol(navigate),
          makePhotoCol(navigate),
          makeContractStatusCol(navigate),
          makeContractVisaExpiryCol(navigate),
        );

      } else if (
        variant === 'overseas_dashboard_3' ||
        variant === 'overseas_dashboard_4' ||
        variant === 'overseas_dashboard_5'
      ) {
        cols.push(
          makeProfileStatusCol(navigate),
          makeActivityStatusCol(navigate),
          makeDaysAvailableCol(),
          makeViewsCol(true),
          makeJobOfferStatsCol(navigate),
          makePassportCol(navigate, 'passport'),
          makeOverseasExpCol(),
        );

      } else {
        // Default / fallback
        if (variant === 'overseas_philippines_default') {
          cols.push(
            makeUpdatedCol(navigate),
            makeProfileStatusCol(navigate),
            makeDelayCol(),
            makeBiodataCol(navigate),
            makePhotoCol(navigate),
            {
              header: t('key_assign_partner'),
              sortKey: 'pt_assign_status',
              render: (row) => (
                <DocumentStatusCell
                  status={ row?.worker_overseas_detail_info?.pt_assign_status }
                  onClick={ () => navigate(row, 'assign-pt') }
                />
              ),
            },
            {
              header: t('key_PT'),
              sortKey: 'pt_status',
              render: (row) => (
                <DocumentStatusCell
                  status={ row?.worker_overseas_detail_info?.pt_status }
                  onClick={ () => navigate(row, 'pt') }
                />
              ),
            },
          );
        } else {
          cols.push(makeProfileStatusCol(navigate));

          if (variant === 'dashboard_1_default') {
            cols.push(
              makeOnboarding1Col('dashboard2_onboarding1'),
              makeOnboarding2Col('dashboard2_onboarding2'),
            );
          }
        }
      }
    }

    if (Array.isArray(fieldsToShow)) {
      return cols.filter((col) => fieldsToShow.includes(col.header));
    }
    return cols;
  }, [
    navigate,
    renderDocumentStatus,
    fieldsToShow,
    activeDashboard,
    staffType,
    type,
    overseasId,
    localId,
    hasPhil,
    hasIndo,
    currentUserCountry,
  ]);

  return allColumns;
}

// ─── PropTypes for the main exported function ────────────────────────────────
WorkerTableColumns.propTypes = {
  fieldsToShow: PropTypes.arrayOf(PropTypes.string),
  nationality: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
  ]),
  type: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  activeDashboard: PropTypes.string,
  handleNavigate: PropTypes.func,
  staffType: PropTypes.string,
  staffCountryID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

