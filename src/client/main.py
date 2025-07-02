from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# Подключаем каталог с HTML/JS/CSS
app.mount("/static", StaticFiles(directory="templates", html=True), name="static")

# Главная страница → index.html
@app.get("/", response_class=FileResponse)
async def root():
    return FileResponse("templates/index.html")
