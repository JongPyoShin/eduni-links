FROM python:3.11-slim
WORKDIR /app
COPY nice-gui-1-1-7/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY nice-gui-1-1-7 /app
COPY files-mentioned-by-the-user-oracle/outputs /app/hanja-data
ENV EDUNI_HOST=0.0.0.0 PORT=8080 EDUNI_HANJA_DIR=/data/hanja EDUNI_HANJA_SOURCE_DIR=/app/hanja-data
EXPOSE 8080
CMD ["python", "app.py"]
