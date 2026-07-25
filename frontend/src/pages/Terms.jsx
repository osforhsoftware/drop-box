import LegalPage from "../components/LegalPage";
import { POLICY_PAGES } from "../constants/policies";

const policy = POLICY_PAGES.terms;

export default function Terms() {
  return <LegalPage testId="terms-page" {...policy} />;
}
