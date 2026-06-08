FROM golang:1.22-alpine AS builder

WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai
RUN adduser -D -g '' appuser
WORKDIR /app
COPY --from=builder /app/api .
COPY --from=builder /app/web ./web
RUN chown -R appuser:appuser /app
EXPOSE 8080
USER appuser
CMD ["./api"]
