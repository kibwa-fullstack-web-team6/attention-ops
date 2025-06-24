from fastapi import FastAPI
import uvicorn
from apiRouter import router as api_router

app = FastAPI()

app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

@app.get("/api/health")
def healthCheck():
    print("health check")
    return {"status": 200, "message": "OK"}