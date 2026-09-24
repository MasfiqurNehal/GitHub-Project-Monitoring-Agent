from fastapi import FastAPI

app = FastAPI(
    title="GitHub Project Monitoring FastAPI Service",
    description="Python microservice for code similarity, NLP, and advanced analytics.",
    version="1.0.0",
)

@app.get("/")
def read_root():
    return {
        "service": "GitHub Monitoring FastAPI Analytics Engine",
        "status": "active"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
