import { UserRole } from "src/modules/users-roles/entities";

export class GetUserDocumentsOutput {
  documents: Partial<UserRole>;
}
