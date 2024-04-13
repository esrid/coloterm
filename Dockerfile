FROM golang:1.22 
WORKDIR /usr/src/app
COPY go.mod ./
RUN go mod download && go mod verify
COPY . .
RUN go build -v -o /usr/local/bin/app ./...
ENV PORT=80
EXPOSE 80
CMD ["app"]
