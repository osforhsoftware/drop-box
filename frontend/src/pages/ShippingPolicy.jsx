import LegalPage from "../components/LegalPage";
import { POLICY_PAGES } from "../constants/policies";

const policy = POLICY_PAGES.shipping;

export default function ShippingPolicy() {
  return <LegalPage testId="shipping-policy-page" {...policy} />;
}
