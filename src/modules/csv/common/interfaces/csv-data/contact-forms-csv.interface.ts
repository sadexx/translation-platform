export interface IContactFormsCsv {
  name: string | null;
  email: string;
  message: string | null;
}

export const contactFormCsvDataMapping: Record<keyof IContactFormsCsv, string> = {
  name: "Name",
  email: "Email",
  message: "Subject",
};
