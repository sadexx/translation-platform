import { Notification } from "src/modules/notifications/entities";
import { PaginationCursorOutput } from "src/common/outputs";

export interface GetAllNotificationsOutput extends PaginationCursorOutput {
  data: Notification[];
}
