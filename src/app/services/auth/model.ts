import { UserInfo } from "../user/model/user.model";

export interface LoginResponse {
    status: string;
    message: string;
    data: UserInfo;
  }
  
  export interface MeResponse {
    status: string;
    data: UserInfo;
  }