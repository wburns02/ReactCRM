#!/usr/bin/env python3
"""
Minimal CRM Backend Server
Provides authentication and permit API endpoints for the ReactCRM frontend.
Uses the SQLite database with 3.58M permit records.
"""
import json
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
import bcrypt

# ===== Configuration =====
SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# SQLite database with our 3.58M permits
SQLITE_DB_PATH = "/home/will/mgo-unified-output/crm_permits.db"

# Demo users for local development
# Password: demo123
DEMO_PASSWORD_HASH = "$2b$12$gn9QsO3YFZD2o0Tdlbw1NuYVDJ0N.PSCDt1YSegTcs4tkcPid2Uk2"
DEMO_USERS = {
    "will@macseptic.com": {
        "email": "will@macseptic.com",
        "full_name": "Will MacAllister",
        "hashed_password": DEMO_PASSWORD_HASH,
        "is_active": True,
        "is_demo_user": True,
        "role": "admin",
    },
    "demo@example.com": {
        "email": "demo@example.com",
        "full_name": "Demo User",
        "hashed_password": DEMO_PASSWORD_HASH,
        "is_active": True,
        "is_demo_user": True,
        "role": "admin",
    }
}

# ===== App Setup =====
app = FastAPI(
    title="ReactCRM API",
    description="CRM API with 3.58M permit records",
    version="1.0.0",
)

# CORS - allow all local origins and network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
        "http://192.168.7.76:5173",
        "http://192.168.7.76:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v2/auth/login")


# ===== Pydantic Models =====
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class User(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_demo_user: bool = False
    role: str = "user"


class UserInDB(User):
    hashed_password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RoleInfo(BaseModel):
    role: str
    display_name: str
    icon: str
    description: str


class Permit(BaseModel):
    id: str
    permit_number: Optional[str] = None
    state: Optional[str] = None
    jurisdiction_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    owner_name: Optional[str] = None
    applicant_name: Optional[str] = None
    created_date: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    trade: Optional[str] = None


class PermitSearchResponse(BaseModel):
    permits: List[Permit]
    total: int
    page: int
    page_size: int


# ===== Database Connection =====
@contextmanager
def get_db():
    """Get SQLite database connection."""
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ===== Auth Utilities =====
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def get_user(email: str) -> Optional[UserInDB]:
    if email in DEMO_USERS:
        return UserInDB(**DEMO_USERS[email])
    return None


def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user(email)
    if user is None:
        raise credentials_exception
    return user


# ===== Health Endpoint =====
@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "sqlite",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ===== Auth Endpoints =====
@app.post("/api/v2/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint - accepts username/password."""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/v2/auth/login/json", response_model=Token)
async def login_json(login_data: UserLogin):
    """Login endpoint - accepts JSON body."""
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/v2/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user


# ===== Role Endpoints (for demo user) =====
AVAILABLE_ROLES = [
    RoleInfo(role="admin", display_name="Administrator", icon="crown", description="Full system access"),
    RoleInfo(role="executive", display_name="Executive", icon="chart-bar", description="High-level KPIs"),
    RoleInfo(role="manager", display_name="Operations Manager", icon="clipboard", description="Day-to-day ops"),
    RoleInfo(role="technician", display_name="Field Technician", icon="wrench", description="Mobile work orders"),
    RoleInfo(role="phone_agent", display_name="Phone Agent", icon="phone", description="Customer service"),
    RoleInfo(role="dispatcher", display_name="Dispatcher", icon="map", description="Schedule management"),
    RoleInfo(role="billing", display_name="Billing Specialist", icon="dollar-sign", description="Invoicing/payments"),
]


@app.get("/api/v2/roles")
async def get_roles(current_user: User = Depends(get_current_user)):
    """Get available roles for demo user."""
    if current_user.is_demo_user:
        return {"roles": [r.dict() for r in AVAILABLE_ROLES]}
    return {"roles": []}


@app.post("/api/v2/roles/switch")
async def switch_role(role: str = Query(...), current_user: User = Depends(get_current_user)):
    """Switch user role (demo only)."""
    if not current_user.is_demo_user:
        raise HTTPException(status_code=403, detail="Role switching only available for demo users")
    valid_roles = [r.role for r in AVAILABLE_ROLES]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    return {"success": True, "new_role": role}


@app.get("/api/v2/roles/current")
async def get_current_role(current_user: User = Depends(get_current_user)):
    """Get current role configuration."""
    role_info = next((r for r in AVAILABLE_ROLES if r.role == current_user.role), AVAILABLE_ROLES[0])
    return role_info.dict()


# ===== Permit Endpoints =====
@app.get("/api/v2/permits", response_model=PermitSearchResponse)
async def search_permits(
    q: Optional[str] = Query(None, description="Search query"),
    state: Optional[str] = Query(None, description="State filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    """Search permits with FTS5 full-text search."""
    offset = (page - 1) * page_size

    with get_db() as conn:
        cursor = conn.cursor()

        if q:
            # Use FTS5 full-text search
            search_query = f'"{q}"' if ' ' in q else f"{q}*"

            # Get total count
            count_sql = """
                SELECT COUNT(*) FROM permits_fts
                WHERE permits_fts MATCH ?
            """
            cursor.execute(count_sql, (search_query,))
            total = cursor.fetchone()[0]

            # Get results
            search_sql = """
                SELECT p.* FROM permits p
                JOIN permits_fts fts ON p.id = fts.rowid
                WHERE permits_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """
            cursor.execute(search_sql, (search_query, page_size, offset))
        else:
            # No search query - return paginated results
            if state:
                cursor.execute("SELECT COUNT(*) FROM permits WHERE state = ?", (state,))
            else:
                cursor.execute("SELECT COUNT(*) FROM permits")
            total = cursor.fetchone()[0]

            if state:
                cursor.execute(
                    "SELECT * FROM permits WHERE state = ? LIMIT ? OFFSET ?",
                    (state, page_size, offset)
                )
            else:
                cursor.execute(
                    "SELECT * FROM permits LIMIT ? OFFSET ?",
                    (page_size, offset)
                )

        rows = cursor.fetchall()
        permits = []
        for row in rows:
            permit = Permit(
                id=row["id"],
                permit_number=row["permit_number"],
                state=row["state"],
                jurisdiction_name=row["jurisdiction_name"],
                address=row["address"],
                city=row["city"],
                zip=row["zip"],
                owner_name=row["owner_name"],
                applicant_name=row["applicant_name"],
                created_date=row["created_date"],
                lat=row["lat"],
                lng=row["lng"],
                trade=row["trade"],
            )
            permits.append(permit)

        return PermitSearchResponse(
            permits=permits,
            total=total,
            page=page,
            page_size=page_size,
        )


@app.get("/api/v2/permits/{permit_id}", response_model=Permit)
async def get_permit(permit_id: str, current_user: User = Depends(get_current_user)):
    """Get a single permit by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM permits WHERE id = ?", (permit_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Permit not found")

        return Permit(
            id=row["id"],
            permit_number=row["permit_number"],
            state=row["state"],
            jurisdiction_name=row["jurisdiction_name"],
            address=row["address"],
            city=row["city"],
            zip=row["zip"],
            owner_name=row["owner_name"],
            applicant_name=row["applicant_name"],
            created_date=row["created_date"],
            lat=row["lat"],
            lng=row["lng"],
            trade=row["trade"],
        )


@app.get("/api/v2/permits/stats/overview")
async def get_permit_stats(current_user: User = Depends(get_current_user)):
    """Get permit statistics overview."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Total count
        cursor.execute("SELECT COUNT(*) FROM permits")
        total = cursor.fetchone()[0]

        # By state
        cursor.execute("""
            SELECT state, COUNT(*) as count
            FROM permits
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY count DESC
            LIMIT 10
        """)
        by_state = [{"state": row["state"], "count": row["count"]} for row in cursor.fetchall()]

        # By trade
        cursor.execute("""
            SELECT trade, COUNT(*) as count
            FROM permits
            WHERE trade IS NOT NULL
            GROUP BY trade
            ORDER BY count DESC
            LIMIT 10
        """)
        by_trade = [{"trade": row["trade"], "count": row["count"]} for row in cursor.fetchall()]

        return {
            "total_permits": total,
            "by_state": by_state,
            "by_trade": by_trade,
        }


# ===== Run Server =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
