from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlite3 import Connection
from app.db.session import get_db
from app.schemas.user import UserPublic, TokenData
from app.repositories import user as user_repo
from app.core.constants import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(
    db: Connection = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> UserPublic:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = user_repo.get_user_by_id(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    return UserPublic(**user)
