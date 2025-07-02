from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.models import User, UserSchema  # предположим, модель в models.py
from tortoise.exceptions import DoesNotExist
from tortoise.exceptions import IntegrityError

router = APIRouter(prefix="/api", tags=["zero-knowledge"])


# ─── Pydantic схемы ────────────────────────────────────────────────
class RegisterPayload(BaseModel):
    email: str
    salt: str
    argon_params: dict
    edek: dict
    encrypted_data: dict


class getdataPayload(BaseModel):
    email: str


class UpdateEncryptedData(BaseModel):
    email: str
    encrypted_data: dict


class ChangeMasterPassword(BaseModel):
    new_salt: str
    new_edek: str
    argon_params: dict


# ─── Эндпоинты ─────────────────────────────────────────────────────

@router.post("/register")
async def register_user(payload: RegisterPayload):
    existing_user = await User.filter(email=payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists"
        )

    try:
        user = await User.create(
            email=payload.email,
            salt=payload.salt,
            argon_params=payload.argon_params,
            edek=payload.edek,
            encrypted_data=payload.encrypted_data
        )
    except IntegrityError:
        # Дополнительная страховка, если параллельно кто-то создал такого же
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists"
        )

    return {"user_id": user.email}

@router.post("/login")
async def getdata(payload: getdataPayload):
    user = await User.filter(email=payload.email).first()
    if user:
        try:
            return {"salt": user.salt,
                    "edek": user.edek,
                    "crypt_data": user.encrypted_data,
                    "argon_params": user.argon_params}
        except Exception as e:
            raise HTTPException(
                status_code=450,
                detail=f"Something wrong{e}"
            )
    else:
        raise HTTPException(
            status_code=409,
            detail="No user with such email"
        )
    

@router.post("/change-password")
async def change_pass(payload: RegisterPayload):
    user = await User.filter(email=payload.email).first()

    if not user:
        raise HTTPException(status_code=409, detail="No user with such email")

    try:
        user.salt = payload.salt
        user.edek = payload.edek
        user.encrypted_data = payload.encrypted_data
        user.argon_params = payload.argon_params
        await user.save()

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user data: {e}")
    
@router.post("/update-data")
async def update_encrypted_data(payload: UpdateEncryptedData):
    user = await User.filter(email=payload.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        user.encrypted_data = payload.encrypted_data
        await user.save()
        return {"status": "encrypted data updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")


@router.get("/get_all_users")
async def get_all_users():
    users = await User.all().values("email", "salt", "argon_params", "edek", "encrypted_data")
    return {"users": "" if not users else users}

