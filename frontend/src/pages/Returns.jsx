import LegalPage from "../components/LegalPage";
import { POLICY_PAGES } from "../constants/policies";

const policy = POLICY_PAGES.returns;

export default function Returns() {
  return <LegalPage testId="returns-page" {...policy} />;
}
