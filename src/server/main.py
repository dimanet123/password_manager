# app/main.py
from fastapi import FastAPI
from tortoise.contrib.fastapi import register_tortoise
from fastapi.middleware.cors import CORSMiddleware
from api import router

from config_reader import config

app = FastAPI(title="Zero-Knowledge Password Service")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или ["*"] — но это небезопасно на проде
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


register_tortoise(
    app,
    db_url=config.DB_URL.get_secret_value(),
    modules={"models": ["db.models.user"]},  # путь до модели User
    generate_schemas=True,
    add_exception_handlers=True,
)