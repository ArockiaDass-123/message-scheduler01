import base64
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode()
    if len(key) < 32:
        key = key.ljust(32, b'=')
    encoded_key = base64.urlsafe_b64encode(key[:32])
    return Fernet(encoded_key)

def encrypt_data(data: Dict[str, Any]) -> str:
    f = _get_fernet()
    raw = json.dumps(data).encode()
    return f.encrypt(raw).decode()

def decrypt_data(encrypted_str: str) -> Dict[str, Any]:
    try:
        f = _get_fernet()
        decrypted = f.decrypt(encrypted_str.encode()).decode()
        return json.loads(decrypted)
    except Exception:
        return {}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id, models.User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user
