import { ShowToast } from "../../components/show-toast/ShowToast";
import { fetchNotificationList, setReceivedNotification } from "../../redux/Slices/common/CommonSlice";
import notificationSound from "../../assets/sounds/notify-sound.wav";

// Single event name list — used for both subscribe and unsubscribe
const NOTIFICATION_EVENTS = [
  'change_employer_cs',
  'change_worker_interpreter',
  'change_contract_cs',
  'assign_contract_cs',
  'job_matched',
  'assign_employer_cs',
  'jo_owner_transferred',
  'upcoming_interview_instant',
  'upcoming_interview',
  'task',
  'one_month_before_contract_visa_expiry_notification_to_cs',
  'update_visa_reference_no_notification_to_cs',
  'processing_medical_file_uploaded',
  'insurance_effective_date_updated',
  'submit_policy_request',
  'assign_worker_interpreter',
  'interview_cancelled_by_worker',
  'worker_no_show',
  'interview_cancelled_by_employer_to_cs',
  'interview_cancelled_by_employer_to_interpreter',
  'interview_rescheduled_by_employer_to_interpreter',
  'interview_cancelled_by_admin_to_cs',
  'interview_cancelled_by_admin_to_interpreter',
  'interview_rescheduled_by_worker_to_cs',
];

// Reuse a single Audio instance instead of creating one per notification
let cachedAudio = null;
const playNotification = () => {
  if (!cachedAudio) {
    cachedAudio = new Audio(notificationSound);
  }
  cachedAudio.currentTime = 0;
  cachedAudio.play().catch(() => { });
};

export const setupSchedulerSocket = (socket, currentUser, dispatch) => {
  const staffId = currentUser?.staff?.id;

  // Auto interview-report popup disabled: the backend now auto-completes an
  // Upcoming interview 30 minutes after its scheduled end time, so the CS is no
  // longer prompted here. Manual report entry from the JO section still works.
  // const isCs = currentUser?.staff?.is_cs;
  // const handleInterviewToBeCompleted = (data) => {
  //   if (isCs) {
  //     const isOwner = staffId === data?.cs_owner_id;
  //     const isNonOwnerAllowed = staffId !== data?.cs_owner_id && joCsNonOwnerInterviewReport === 'y';

  //     if (isOwner || isNonOwnerAllowed) {
  //       setInterviewToBeCompleted(data);
  //       setShowInterviewPopup(true);
  //     }
  //   }
  // };

  // Debounce fetchNotificationList to avoid rapid-fire API calls
  let fetchDebounceTimer = null;
  const debouncedFetchNotifications = () => {
    clearTimeout(fetchDebounceTimer);
    fetchDebounceTimer = setTimeout(() => {
      dispatch(fetchNotificationList({ limit: 10, page: 1 }));
    }, 500);
  };

  const handleChangeCSorInterpreter = (data) => {
    if (!Array.isArray(data) || data.length === 0) return;

    data.forEach((item) => {
      if (item?.staff_id === staffId && item?.message) {
        ShowToast("success", item.message);
        playNotification();
        dispatch(setReceivedNotification(item));
        debouncedFetchNotifications();
      }
    });
  };

  const connectSchedulerSocket = () => {
    if (!socket.connected) {
      socket.connect();
    }

    // socket.on('interviews_to_complete', handleInterviewToBeCompleted);
    NOTIFICATION_EVENTS.forEach((event) => socket.on(event, handleChangeCSorInterpreter));
  };

  const disconnectSchedulerSocket = () => {
    clearTimeout(fetchDebounceTimer);
    // socket.off('interviews_to_complete', handleInterviewToBeCompleted);
    NOTIFICATION_EVENTS.forEach((event) => socket.off(event, handleChangeCSorInterpreter));
    socket.disconnect();
  };

  return {
    connectSchedulerSocket,
    disconnectSchedulerSocket
  };
};