import {
  IAppointmentsCsv,
  ICompaniesCsv,
  IDraftAppointmentsCsv,
  IEmployeesCsv,
  IUsersCsv,
} from "src/modules/csv/common/interfaces/csv-data";

export const appointmentCsvDataMapping: Record<keyof IAppointmentsCsv, string> = {
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
  receivedByInterpreter: "Received by Interpreter",
  interpreterCurrency: "Interpreter Currency",
  appointmentCallRating: "Rating of the Call quality",
  interpreterRating: "Rating of the Interpreter",
  promoCampaignDiscount: "Promo code Discount",
  membershipDiscount: "Membership Discount",
  promoCampaignDiscountMinutes: "Promo code Discount Minutes",
  membershipFreeMinutes: "Membership Free Minutes",
  promoCode: "Promo code",
  membershipType: "Membership type",
};

export const draftAppointmentCsvDataMapping: Record<keyof IDraftAppointmentsCsv, string> = {
  platformId: "Number",
  status: "Status",
  interpreterType: "Interpreter Type",
  schedulingType: "Scheduling Type",
  communicationType: "Communication Type",
  scheduledStartTime: "Scheduled Start Time",
  schedulingDurationMin: "Scheduling Duration Min",
  clientFullName: "Client Full Name",
  languageFrom: "Language From",
  languageTo: "Language To",
  topic: "Topic",
  creationDate: "Creation Date",
};

export const usersCsvDataMapping: Record<keyof IUsersCsv, string> = {
  fullName: "Name",
  accountStatus: "Account Status",
  role: "User Role",
  phoneNumber: "Phone Number",
  email: "Email",
  gender: "Gender",
  knownLanguages: "Known Languages",
  country: "Country",
  state: "State",
  city: "City",
};

export const companiesCsvDataMapping: Record<keyof ICompaniesCsv, string> = {
  name: "Company Name",
  status: "Status",
  country: "Country",
  platformId: "Company ID",
  phoneNumber: "Phone Number",
  contactEmail: "Admin Email",
  activitySphere: "Industry",
  employeesNumber: "Employees",
};

export const employeesCsvDataMapping: Record<keyof IEmployeesCsv, string> = {
  fullName: "Name",
  accountStatus: "Account Status",
  role: "User Role",
  phoneNumber: "Phone Number",
  email: "Email",
  city: "City",
};
