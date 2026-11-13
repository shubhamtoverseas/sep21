import { REACT_APP_PROMPT_AI_COPYWRITER_URL, REACT_APP_AL_X_API_KEY, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';
import { COPY_DEMO_MODE, DEMO_DELAY_MS, pickDemoPackage } from '../components/job-offer/copy-generator/copyGeneratorConfig';

const api = createApiInstance(REACT_APP_PROMPT_AI_COPYWRITER_URL, {
    apiKey: REACT_APP_AL_X_API_KEY,
    sendTokenHeader: false,
    sendAuthHeader: false,
});

// One endpoint for GENERATE and REGENERATE (backend D-08): `{ job_id, fields }` where
// `fields` is the copy_input_schema_v2 payload (the operation travels inside it). The
// Idempotency-Key header lets Retry replay the exact same request, as the brief requires.
// With COPY_DEMO_MODE on, resolves with the prototype-style fixture packages instead.
export const generateJobOfferCopyAPI = (copyInput, requestKey, jobId = null) => {
    if (COPY_DEMO_MODE) {
        return new Promise((resolve) => {
            setTimeout(() => resolve({ data: { copy: pickDemoPackage(copyInput) } }), DEMO_DELAY_MS);
        });
    }
    return api.post(apiPath.aiGenerateJobOfferCopy, { job_id: jobId, fields: copyInput }, {
        headers: { 'Idempotency-Key': requestKey },
    });
};
