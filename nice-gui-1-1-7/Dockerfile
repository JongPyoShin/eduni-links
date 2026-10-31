FROM python:3.11-slim@sha256:f9fa7f851e38bfb19c9de3afbc4b86ae7176ea7aaf94535c31df5458d5849457
ARG VCS_REF=unknown
LABEL org.opencontainers.image.revision=$VCS_REF
WORKDIR /app
COPY nice-gui-1-1-7/requirements.lock.txt /app/requirements.lock.txt
RUN pip install --no-cache-dir -r /app/requirements.lock.txt
COPY nice-gui-1-1-7/app.py /app/app.py
COPY nice-gui-1-1-7/assets /app/assets
COPY nice-gui-1-1-7/content /app/content
COPY nice-gui-1-1-7/hanja-data /app/hanja-data
COPY nice-gui-1-1-7/portal_app /app/portal_app
COPY nice-gui-1-1-7/scripts /app/scripts
COPY shared /shared
ENV EDUNI_HOST=0.0.0.0 PORT=18081 EDUNI_HANJA_DIR=/data/hanja EDUNI_HANJA_SOURCE_DIR=/app/hanja-data
EXPOSE 18081
CMD ["python", "app.py"]