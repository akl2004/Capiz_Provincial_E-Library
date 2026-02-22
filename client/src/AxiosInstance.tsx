import axios from "axios";

const apiIP = import.meta.env.VITE_API_IP;
const apiPort = import.meta.env.VITE_API_PORT;

const AxiosInstance = axios.create({
  baseURL: `http://${apiIP}:${apiPort}/api`,
});

AxiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');

    if(token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }

    if(config.data instanceof FormData) {
        config.headers["Content-Type"] = "multipart/form-data";
    } else {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

AxiosInstance.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        if(error.response.status != 422) {
            console.error('Unexpected response error: ', error)
        }

        return Promise.reject(error);
    }
);

export default AxiosInstance;