FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Download Coral from GitHub releases
RUN mkdir -p /root/.local/bin && \
    curl -L "https://github.com/withcoral/coral/releases/download/v0.4.1/coral-x86_64-unknown-linux-gnu.tar.gz" \
    -o /tmp/coral.tar.gz && \
    tar -xzf /tmp/coral.tar.gz -C /root/.local/bin && \
    chmod +x /root/.local/bin/coral && \
    rm /tmp/coral.tar.gz

ENV PATH="/root/.local/bin:$PATH"

RUN mkdir -p /root/.config/coral
COPY coral-config/config.toml /root/.config/coral/config.toml

EXPOSE 8000

CMD ["/bin/sh", "-c", "coral source add github || true && uvicorn main:app --host 0.0.0.0 --port 8000"]
