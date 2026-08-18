export type AppAccessStatus = 'pending' | 'active' | 'disabled';

export interface AsisUser {
  id: number;
  email: string;
  name: string | null;
  roles: string[];
  app_status: AppAccessStatus;
  last_login_at: string | null;
}

export interface AsisRole {
  code: string;
  name: string;
  description: string;
}
