import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface WorkspaceInvitation {
  id: string;
  invitationId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  workspaceName: string;
  workspaceDomain: string;
  invitedRole: "user" | "viewer" | "editor";
  message?: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
}

export interface SendInvitationData {
  inviteeEmail: string;
  inviteeName?: string;
  invitedRole?: "user" | "viewer" | "editor";
  message?: string;
  allowedTimeBuckets?: (
    | "today"
    | "last7"
    | "last15"
    | "last30"
    | "last90"
    | "all"
  )[];
  grantedDirectories?: Array<{
    directoryId: string;
    role: "viewer" | "editor";
  }>;
}

export interface UserWorkspace {
  workspaceDomain: string;
  workspaceName: string;
  role: "user" | "viewer" | "editor";
  invitedBy: string;
  joinedAt: string;
  isActive: boolean;
}

export const workspaceInvitationService = {
  // Send workspace invitation
  async sendInvitation(
    data: SendInvitationData
  ): Promise<{ message: string; invitation: any }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/send`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Admin: update a user's time-bucket permissions for current workspace
  async updateUserBuckets(
    userEmail: string,
    allowedTimeBuckets: (
      | "today"
      | "last7"
      | "last15"
      | "last30"
      | "last90"
      | "all"
    )[]
  ): Promise<{ message: string; allowedTimeBuckets: string[] }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/workspace/update-user-buckets`,
      { userEmail, allowedTimeBuckets },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Admin: revoke user access to current workspace
  async revokeUserAccess(userEmail: string): Promise<{ message: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/workspace/revoke-user-access`,
      { userEmail },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get all invitations for current workspace (admin only)
  async getWorkspaceInvitations(): Promise<WorkspaceInvitation[]> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/workspace-invitations/workspace`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get invitations sent to a specific email
  async getInvitationsByEmail(email: string): Promise<WorkspaceInvitation[]> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/workspace-invitations/email/${email}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Accept invitation
  async acceptInvitation(
    invitationId: string
  ): Promise<{ message: string; workspace: any }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/${invitationId}/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Decline invitation
  async declineInvitation(invitationId: string): Promise<{ message: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/${invitationId}/decline`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Cancel invitation (admin only)
  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(
      `${API_URL}/workspace-invitations/${invitationId}/cancel`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Delete invitation (admin only)
  async deleteInvitation(invitationId: string): Promise<{ message: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(
      `${API_URL}/workspace-invitations/${invitationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get user's accessible workspaces
  async getUserWorkspaces(): Promise<{
    workspaces: UserWorkspace[];
    currentWorkspace: string;
  }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/workspace-invitations/user/workspaces`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Switch workspace
  async switchWorkspace(
    workspaceDomain: string
  ): Promise<{ message: string; currentWorkspace: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/user/switch-workspace`,
      { workspaceDomain },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get invitation details (public route)
  async getInvitationDetails(
    invitationId: string
  ): Promise<{ invitation: any }> {
    const response = await axios.get(`${API_URL}/invitation/${invitationId}`);
    return response.data;
  },

  // Update friendly workspace name for current user
  async updateWorkspaceName(
    workspaceDomain: string,
    workspaceName: string
  ): Promise<{ message: string; workspaceName: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/user/update-workspace-name`,
      { workspaceDomain, workspaceName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Admin: grant directory access to a user
  async grantDirectoryAccess(
    userEmail: string,
    directoryIds: string[],
    role: "viewer" | "editor"
  ): Promise<{ message: string; granted: string[]; errors?: string[] }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/workspace/users/directories/grant`,
      { userEmail, directoryIds, role },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Admin: revoke directory access from a user
  async revokeDirectoryAccess(
    userEmail: string,
    directoryId: string
  ): Promise<{ message: string }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/workspace-invitations/workspace/users/directories/revoke`,
      { userEmail, directoryId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Admin: get all directories a user has access to
  async getUserDirectories(
    userEmail: string
  ): Promise<{
    directories: Array<{
      directoryId: string;
      directoryName: string;
      role: "viewer" | "editor";
      shareId: string;
      createdAt: string;
    }>;
  }> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/workspace-invitations/workspace/users/${encodeURIComponent(userEmail)}/directories`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};

export default workspaceInvitationService;
