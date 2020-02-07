FROM alpine:3.8
RUN apk add python3 && \
python3 -m ensurepip && \
pip3 install --upgrade pip && \
pip3 install flask

ENV FLASK_APP app.py

WORKDIR /app
COPY . /app/
CMD ["python3", "app.py"]
