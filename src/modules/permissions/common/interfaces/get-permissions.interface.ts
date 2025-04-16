import { Method } from "src/modules/permissions/entities";

export interface IGetPermissions {
  methods: Method[];
  modules: IGetPermissionsModules;
}

export interface IGetPermissionsModules {
  [key: string]: {
    isAllAllowed: boolean;
    isAllNotEditable: boolean;
  };
}
