FROM golang:1.22 as build
WORKDIR /src
COPY go.mod /
RUN --mount=type=cache,target=/go/pkg/mod go mod download || true

COPY . .
RUN go mod tidy
RUN --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/app main.go
FROM gcr.io/distroless/base-debian12
COPY --from=build /out/app /app
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/app"]