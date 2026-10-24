import { seedSharedRows } from "./seedProfileUser";

export default function globalSetup(): void {
  seedSharedRows();
}
