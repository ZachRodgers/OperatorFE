import axios from "axios";

// Update the base URL to match your backend
export const API_BASE_URL =
  "http://localhost:8085/ParkingWithParallel/parkinglots";

// Sessions API endpoints with corrected paths
export const getSessions = () => {
  return axios.get(`${API_BASE_URL}/sessions/get-all`);
};

export const getSessionById = (sessionId: string) => {
  return axios.get(`${API_BASE_URL}/sessions/get-by-id/${sessionId}`);
};

export const getSessionsByLot = (lotId: string) => {
  return axios.get(`${API_BASE_URL}/sessions/get-by-lot/${lotId}`);
};

export const createSession = (sessionData: any) => {
  return axios.post(`${API_BASE_URL}/sessions/create`, sessionData);
};

export const updateSession = (sessionId: string, sessionData: any) => {
  return axios.put(`${API_BASE_URL}/sessions/update/${sessionId}`, sessionData);
};

export const validateSession = (
  sessionId: string,
  validated: boolean,
  modifiedBy: string
) => {
  return axios.put(
    `${API_BASE_URL}/sessions/validate/${sessionId}?validated=${validated}&modifiedBy=${modifiedBy}`
  );
};

export const endSession = (
  sessionId: string,
  exitDeviceId: string,
  modifiedBy: string
) => {
  console.log(`Calling end session API for session ${sessionId}`);
  return axios.put(`${API_BASE_URL}/sessions/end/${sessionId}`, null, {
    params: {
      exitDeviceId: exitDeviceId,
      modifiedBy: modifiedBy,
    },
  });
};

export const deleteSession = (sessionId: string) => {
  console.log(`Deleting session with ID: ${sessionId}`);
  return axios.delete(`${API_BASE_URL}/sessions/delete/${sessionId}`);
};
