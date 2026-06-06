from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --- Setup ---
UPLOAD_DIR = ROOT_DIR / "uploads"
(UPLOAD_DIR / "designs").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "payments").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "templates").mkdir(parents=True, exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")

app = FastAPI(title="FORM CaseCraft API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("form")


# --- Helpers ---
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_url(path: str) -> str:
    # path expected like 'uploads/designs/xx.png'
    if PUBLIC_BASE_URL:
        return f"{PUBLIC_BASE_URL}/api/{path}"
    return f"/api/{path}"


async def save_upload(file: UploadFile, subdir: str) -> str:
    ext = (file.filename or "file").split(".")[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(400, "Unsupported file type")
    name = f"{uuid.uuid4().hex}.{ext}"
    target_dir = UPLOAD_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / name
    data = await file.read()
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 12MB)")
    target.write_bytes(data)
    return public_url(f"uploads/{subdir}/{name}")


# --- Models ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BrandIn(BaseModel):
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None


class ModelIn(BaseModel):
    brand_id: str
    name: str
    image_url: Optional[str] = None


class ProductIn(BaseModel):
    name: str
    slug: str
    description: str
    price: float
    image_url: Optional[str] = None


class OrderIn(BaseModel):
    customer_name: str
    phone: str
    email: Optional[str] = None
    address: str
    state: str
    pincode: str
    brand_id: str
    brand_name: str
    model_id: str
    model_name: str
    product_id: str
    product_name: str
    amount: float
    design_url: str
    preview_url: Optional[str] = None
    notes: Optional[str] = None


class PaymentProofIn(BaseModel):
    utr: str
    screenshot_url: str


class StatusUpdate(BaseModel):
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None


class SettingsIn(BaseModel):
    upi_id: str
    merchant_name: str
    whatsapp_number: str
    currency: str = "INR"


# --- Auth ---
@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["email"])
    response.set_cookie(
        "access_token", token, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/"
    )
    return {
        "access_token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user["role"]},
    }


@api.get("/auth/me")
async def me(admin=Depends(get_current_admin)):
    return admin


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# --- Brands ---
@api.get("/brands")
async def list_brands():
    items = await db.brands.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return items


@api.post("/brands")
async def create_brand(data: BrandIn, admin=Depends(get_current_admin)):
    item = {"id": str(uuid.uuid4()), "name": data.name, "slug": data.slug or data.name.lower().replace(" ", "-"),
            "logo_url": data.logo_url, "created_at": now_iso()}
    await db.brands.insert_one(item)
    item.pop("_id", None)
    return item


@api.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, admin=Depends(get_current_admin)):
    await db.brands.delete_one({"id": brand_id})
    await db.models.delete_many({"brand_id": brand_id})
    return {"ok": True}


# --- Models ---
@api.get("/models")
async def list_models(brand_id: Optional[str] = None):
    q = {"brand_id": brand_id} if brand_id else {}
    items = await db.models.find(q, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api.post("/models")
async def create_model(data: ModelIn, admin=Depends(get_current_admin)):
    item = {"id": str(uuid.uuid4()), "brand_id": data.brand_id, "name": data.name,
            "image_url": data.image_url, "created_at": now_iso()}
    await db.models.insert_one(item)
    item.pop("_id", None)
    return item


@api.delete("/models/{model_id}")
async def delete_model(model_id: str, admin=Depends(get_current_admin)):
    await db.models.delete_one({"id": model_id})
    return {"ok": True}


# --- Products (case types) ---
@api.get("/products")
async def list_products():
    items = await db.products.find({}, {"_id": 0}).sort("price", 1).to_list(100)
    return items


@api.post("/products")
async def create_product(data: ProductIn, admin=Depends(get_current_admin)):
    item = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    await db.products.insert_one(item)
    item.pop("_id", None)
    return item


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, admin=Depends(get_current_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


# --- Uploads ---
@api.post("/upload/design")
async def upload_design(file: UploadFile = File(...)):
    url = await save_upload(file, "designs")
    return {"url": url}


@api.post("/upload/payment")
async def upload_payment(file: UploadFile = File(...)):
    url = await save_upload(file, "payments")
    return {"url": url}


@api.post("/upload/preview")
async def upload_preview(file: UploadFile = File(...)):
    url = await save_upload(file, "designs")
    return {"url": url}


# --- Orders ---
def gen_order_id() -> str:
    return "FRM-" + datetime.now(timezone.utc).strftime("%y%m%d") + "-" + secrets.token_hex(3).upper()


@api.post("/orders")
async def create_order(data: OrderIn):
    order = {
        "id": str(uuid.uuid4()),
        "order_id": gen_order_id(),
        **data.model_dump(),
        "payment_status": "pending",
        "delivery_status": "pending_payment_verification",
        "utr": None,
        "payment_screenshot_url": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order


@api.get("/orders/{order_id}")
async def get_order(order_id: str):
    o = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@api.post("/orders/{order_id}/payment-proof")
async def submit_payment_proof(order_id: str, data: PaymentProofIn):
    o = await db.orders.find_one({"order_id": order_id})
    if not o:
        raise HTTPException(404, "Order not found")
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "utr": data.utr,
            "payment_screenshot_url": data.screenshot_url,
            "payment_status": "submitted",
            "delivery_status": "pending_payment_verification",
            "updated_at": now_iso(),
        }},
    )
    o2 = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    return o2


@api.get("/admin/orders")
async def admin_orders(admin=Depends(get_current_admin)):
    items = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.patch("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, data: StatusUpdate, admin=Depends(get_current_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = now_iso()
    await db.orders.update_one({"order_id": order_id}, {"$set": update})
    return await db.orders.find_one({"order_id": order_id}, {"_id": 0})


@api.get("/admin/analytics")
async def analytics(admin=Depends(get_current_admin)):
    total = await db.orders.count_documents({})
    pending = await db.orders.count_documents({"payment_status": {"$in": ["pending", "submitted"]}})
    approved = await db.orders.count_documents({"payment_status": "approved"})
    shipped = await db.orders.count_documents({"delivery_status": "shipped"})
    delivered = await db.orders.count_documents({"delivery_status": "delivered"})
    revenue_cursor = db.orders.find({"payment_status": "approved"}, {"amount": 1, "_id": 0})
    revenue = 0.0
    async for d in revenue_cursor:
        revenue += float(d.get("amount", 0))
    return {"total_orders": total, "pending": pending, "approved": approved,
            "shipped": shipped, "delivered": delivered, "revenue": revenue}


# --- Settings ---
@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"id": "main"}, {"_id": 0})
    if not s:
        s = {"id": "main", "upi_id": "merchant@upi", "merchant_name": "FORM CaseCraft",
             "whatsapp_number": "+919999999999", "currency": "INR"}
        await db.settings.insert_one(s)
    return s


@api.put("/settings")
async def update_settings(data: SettingsIn, admin=Depends(get_current_admin)):
    update = data.model_dump()
    await db.settings.update_one({"id": "main"}, {"$set": update}, upsert=True)
    return await db.settings.find_one({"id": "main"}, {"_id": 0})


# --- Health ---
@api.get("/")
async def root():
    return {"status": "ok", "service": "FORM CaseCraft"}


# --- Mount static uploads (under /api so ingress routes correctly) ---
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Seeders ---
DEFAULT_BRANDS = [
    {"name": "Apple", "models": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14", "iPhone 13"]},
    {"name": "Samsung", "models": ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy A54", "Galaxy Note 20"]},
    {"name": "Xiaomi", "models": ["Xiaomi 14", "Redmi Note 13 Pro", "Poco F5", "Redmi 12"]},
    {"name": "Vivo", "models": ["Vivo V30 Pro", "Vivo X100", "Vivo Y100"]},
    {"name": "Oppo", "models": ["Oppo Find X7", "Oppo Reno 11", "Oppo A78"]},
    {"name": "OnePlus", "models": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3"]},
    {"name": "Google Pixel", "models": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a"]},
]

DEFAULT_PRODUCTS = [
    {"name": "Silicone Case", "slug": "silicone", "price": 299.0,
     "description": "Soft-touch liquid silicone with microfiber lining. Slim, grippy, and shock-absorbent."},
    {"name": "Transparent Case", "slug": "transparent", "price": 349.0,
     "description": "Crystal-clear polycarbonate. Show off your phone while protecting your design."},
    {"name": "Matte Case", "slug": "matte", "price": 399.0,
     "description": "Smooth matte finish that resists fingerprints. Premium soft-touch feel."},
    {"name": "Glass Case", "slug": "glass", "price": 499.0,
     "description": "Tempered glass back with metallic edges. Scratch resistant flagship feel."},
]


@app.on_event("startup")
async def on_startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.brands.create_index("id", unique=True)
    await db.models.create_index("id", unique=True)
    await db.orders.create_index("order_id", unique=True)

    # seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    else:
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hash_password(admin_password)}})

    # seed brands and models
    if await db.brands.count_documents({}) == 0:
        for b in DEFAULT_BRANDS:
            brand_id = str(uuid.uuid4())
            await db.brands.insert_one({
                "id": brand_id, "name": b["name"],
                "slug": b["name"].lower().replace(" ", "-"),
                "logo_url": None, "created_at": now_iso()})
            for m in b["models"]:
                await db.models.insert_one({
                    "id": str(uuid.uuid4()), "brand_id": brand_id,
                    "name": m, "image_url": None, "created_at": now_iso()})
        logger.info("Seeded default brands and models")

    # seed products
    if await db.products.count_documents({}) == 0:
        for p in DEFAULT_PRODUCTS:
            await db.products.insert_one({
                "id": str(uuid.uuid4()), **p, "image_url": None, "created_at": now_iso()})
        logger.info("Seeded default products")

    # seed settings
    if not await db.settings.find_one({"id": "main"}):
        await db.settings.insert_one({
            "id": "main", "upi_id": "merchant@upi", "merchant_name": "FORM CaseCraft",
            "whatsapp_number": "+919999999999", "currency": "INR"})


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
