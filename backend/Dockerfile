FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN CORAL_VERSION=0.3.0 curl -fsSL https://withcoral.com/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

RUN mkdir -p /root/.config/coral
COPY coral-config/config.toml /root/.config/coral/config.toml

EXPOSE 8000

CMD ["/bin/sh", "-c", "coral source add github || true && uvicorn main:app --host 0.0.0.0 --port 8000"]
