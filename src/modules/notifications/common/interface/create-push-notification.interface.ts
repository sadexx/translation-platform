import { Session } from "src/modules/sessions/entities";
import { ENotificationType } from "src/modules/notifications/common/enum";
import { INotificationData } from "src/modules/notifications/common/interface";

export interface ICreatePushNotification {
  userDevices: Session[];
  title: ENotificationType;
  message: string;
  notificationData: INotificationData;
}
