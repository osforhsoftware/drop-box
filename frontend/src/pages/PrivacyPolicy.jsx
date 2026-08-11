import LegalPage from "../components/LegalPage";
import { POLICY_PAGES } from "../constants/policies";

const policy = POLICY_PAGES.privacy;

export default function PrivacyPolicy() {
  return <LegalPage testId="privacy-page" {...policy} />;
}
