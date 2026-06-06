"""Backend integration tests for FORM CaseCraft."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://casecraft-custom.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@casecraft.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Health ---
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Brands ---
def test_brands_seeded(s):
    r = s.get(f"{API}/brands")
    assert r.status_code == 200
    brands = r.json()
    names = {b["name"] for b in brands}
    expected = {"Apple", "Samsung", "Xiaomi", "Vivo", "Oppo", "OnePlus", "Google Pixel"}
    assert expected.issubset(names), f"Missing brands: {expected - names}"
    assert len(brands) >= 7


# --- Models ---
def test_models_by_brand(s):
    brands = s.get(f"{API}/brands").json()
    apple = next(b for b in brands if b["name"] == "Apple")
    r = s.get(f"{API}/models", params={"brand_id": apple["id"]})
    assert r.status_code == 200
    models = r.json()
    assert len(models) > 0
    assert all(m["brand_id"] == apple["id"] for m in models)


# --- Products ---
def test_products_seeded(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    by_name = {p["name"]: p["price"] for p in products}
    assert by_name.get("Silicone Case") == 299.0
    assert by_name.get("Transparent Case") == 349.0
    assert by_name.get("Matte Case") == 399.0
    assert by_name.get("Glass Case") == 499.0


# --- Settings ---
def test_settings_get(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    d = r.json()
    for k in ("upi_id", "merchant_name", "whatsapp_number", "currency"):
        assert k in d


# --- Auth ---
def test_auth_me_with_token(s, auth_headers):
    r = s.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_login_sets_cookie():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert "access_token" in sess.cookies, "httpOnly cookie not set"


# --- Upload + static serve ---
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
    b"\x00\x01\x01\x01\x00\x1b\xb6\xee\x56\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(scope="session")
def uploaded_design_url(s):
    files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = s.post(f"{API}/upload/design", files=files)
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert "/api/uploads/designs/" in url
    return url


def test_upload_design_and_static_serve(s, uploaded_design_url):
    r = s.get(uploaded_design_url)
    assert r.status_code == 200
    assert len(r.content) > 0


# --- Orders ---
@pytest.fixture(scope="session")
def order_id(s, uploaded_design_url):
    brands = s.get(f"{API}/brands").json()
    apple = next(b for b in brands if b["name"] == "Apple")
    models = s.get(f"{API}/models", params={"brand_id": apple["id"]}).json()
    products = s.get(f"{API}/products").json()
    p = next(p for p in products if p["name"] == "Silicone Case")
    payload = {
        "customer_name": "TEST_Buyer",
        "phone": "9999999999",
        "email": "test@example.com",
        "address": "123 Street",
        "state": "Karnataka",
        "pincode": "560001",
        "brand_id": apple["id"], "brand_name": apple["name"],
        "model_id": models[0]["id"], "model_name": models[0]["name"],
        "product_id": p["id"], "product_name": p["name"],
        "amount": p["price"],
        "design_url": uploaded_design_url,
    }
    r = s.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["order_id"].startswith("FRM-")
    assert o["payment_status"] == "pending"
    assert o["delivery_status"] == "pending_payment_verification"
    return o["order_id"]


def test_get_order(s, order_id):
    r = s.get(f"{API}/orders/{order_id}")
    assert r.status_code == 200
    assert r.json()["order_id"] == order_id


def test_payment_proof(s, order_id):
    r = s.post(f"{API}/orders/{order_id}/payment-proof",
               json={"utr": "UTR123456789", "screenshot_url": "/api/uploads/payments/x.png"})
    assert r.status_code == 200
    d = r.json()
    assert d["payment_status"] == "submitted"
    assert d["utr"] == "UTR123456789"


# --- Admin ---
def test_admin_orders(s, auth_headers, order_id):
    r = s.get(f"{API}/admin/orders", headers=auth_headers)
    assert r.status_code == 200
    orders = r.json()
    assert any(o["order_id"] == order_id for o in orders)


def test_admin_update_order(s, auth_headers, order_id):
    r = s.patch(f"{API}/admin/orders/{order_id}", headers=auth_headers,
                json={"payment_status": "approved", "delivery_status": "payment_approved"})
    assert r.status_code == 200
    d = r.json()
    assert d["payment_status"] == "approved"
    assert d["delivery_status"] == "payment_approved"


def test_admin_analytics(s, auth_headers):
    r = s.get(f"{API}/admin/analytics", headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_orders", "pending", "approved", "shipped", "delivered", "revenue"):
        assert k in d


def test_admin_settings_update(s, auth_headers):
    orig = s.get(f"{API}/settings").json()
    payload = {
        "upi_id": "test@upi", "merchant_name": "TEST_Merchant",
        "whatsapp_number": "+911234567890", "currency": "INR",
    }
    r = s.put(f"{API}/settings", headers=auth_headers, json=payload)
    assert r.status_code == 200
    d = r.json()
    assert d["upi_id"] == "test@upi"
    # restore
    s.put(f"{API}/settings", headers=auth_headers, json={
        "upi_id": orig["upi_id"], "merchant_name": orig["merchant_name"],
        "whatsapp_number": orig["whatsapp_number"], "currency": orig.get("currency", "INR")})


def test_brand_create_delete_cascades_models(s, auth_headers):
    r = s.post(f"{API}/brands", headers=auth_headers, json={"name": "TEST_Brand"})
    assert r.status_code == 200
    brand = r.json()
    bid = brand["id"]
    # add a model
    rm = s.post(f"{API}/models", headers=auth_headers, json={"brand_id": bid, "name": "TEST_Model"})
    assert rm.status_code == 200
    # delete brand → should cascade models
    rd = s.delete(f"{API}/brands/{bid}", headers=auth_headers)
    assert rd.status_code == 200
    remaining = s.get(f"{API}/models", params={"brand_id": bid}).json()
    assert remaining == []
