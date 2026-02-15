FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure NLTK data is downloaded during build if possible, or it will happen on startup
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('brown'); nltk.download('punkt_tab'); nltk.download('averaged_perceptron_tagger'); nltk.download('wordnet')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
