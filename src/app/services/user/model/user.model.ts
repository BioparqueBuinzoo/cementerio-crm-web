export interface UserInfo {
    id: string;
    iamUserId: number;
    email: string;
    name: string;
    pictureUrl: string | null;
    management: string | null;
    roles: string[];
    views: string[];
    appStatus: 'pending' | 'active' | 'disabled';
  }
