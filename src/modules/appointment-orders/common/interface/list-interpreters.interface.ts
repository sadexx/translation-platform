import { InterpreterProfile } from "src/modules/interpreter-profile/entities";

export interface IListInterpreters {
  interpreter: InterpreterProfile;
  type: IInterpreterOrderStatus;
}

type IInterpreterOrderStatus = "ignored" | "declined";
