export interface AsisUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  is_active: boolean;
  created_at: string;
}
