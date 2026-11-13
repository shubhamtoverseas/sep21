import { apiPath } from './apiPath';
import app from './appClient';


export const getInterviewListAPI = (reqPayload) => app.post(apiPath.getInterviewList, reqPayload);
