import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface DomainConfig {
    domainId: string;
    domainName: string;
    investor_match_only: boolean;
    valuation_matching: boolean;
    adverse_finding: boolean;
    target_investors: string[];
    custom_summary_sop: string;
    validator_checklist: string[];
}

export const domainService = {
    // Get current domain configuration
    getConfig: async (): Promise<DomainConfig> => {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`${API_URL}/domain/config`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    },

    // Update domain configuration
    updateConfig: async (config: Partial<DomainConfig>): Promise<DomainConfig> => {
        const token = localStorage.getItem("accessToken");
        const response = await axios.put(`${API_URL}/domain/config`, config, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.config;
    }
};
