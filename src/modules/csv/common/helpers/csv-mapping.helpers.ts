import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { appointmentCsvDataMapping } from "src/modules/csv/common/constants";

export function getAppointmentCsvMapping(user: ITokenUserData): Record<string, string> {
  if (CLIENT_ROLES.includes(user.role)) {
    return {
      platformId: "Number",
      status: "Status",
      interpreterType: "Interpreter Type",
      schedulingType: "Scheduling Type",
      communicationType: "Communication Type",
      scheduledStartTime: "Scheduled Start Time",
      scheduledEndTime: "Scheduled End Time",
      schedulingDurationMin: "Scheduling Duration Min",
      interpreterFullName: "Interpreter Full Name",
      interpreterRole: "Interpreter Role",
      clientFullName: "Client Full Name",
      languageFrom: "Language From",
      languageTo: "Language To",
      topic: "Topic",
      creationDate: "Creation Date",
      paidByClient: "Paid by Client",
      clientCurrency: "Client Currency",
    };
  }

  if (INTERPRETER_ROLES.includes(user.role)) {
    return {
      platformId: "Number",
      status: "Status",
      interpreterType: "Interpreter Type",
      schedulingType: "Scheduling Type",
      communicationType: "Communication Type",
      scheduledStartTime: "Scheduled Start Time",
      scheduledEndTime: "Scheduled End Time",
      schedulingDurationMin: "Scheduling Duration Min",
      interpreterFullName: "Interpreter Full Name",
      interpreterRole: "Interpreter Role",
      clientFullName: "Client Full Name",
      languageFrom: "Language From",
      languageTo: "Language To",
      topic: "Topic",
      creationDate: "Creation Date",
      receivedByInterpreter: "Received by Interpreter",
      interpreterCurrency: "Interpreter Currency",
    };
  }

  return appointmentCsvDataMapping;
}
