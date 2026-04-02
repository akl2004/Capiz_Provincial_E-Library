import axios from "axios";

const discoveredURL = localStorage.getItem("API_URL");

const apiIP = import.meta.env.VITE_API_IP;
const apiPort = import.meta.env.VITE_API_PORT;

const portString = apiPort && apiPort !== "80" ? `:${apiPort}` : "";
const envURL = `http://${apiIP}${portString}`;

export const BASE_URL = discoveredURL || envURL;

const finalBaseURL = `${BASE_URL}/api`;

const AxiosInstance = axios.create({
  baseURL: finalBaseURL,
});

AxiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    config.headers["Content-Type"] = "multipart/form-data";
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status != 422) {
        console.error("Unexpected response error: ", error);
      }
    } else {
      console.error("Network Error: The server did not respond.", error);
    }

    return Promise.reject(error);
  },
);

export default AxiosInstance;
