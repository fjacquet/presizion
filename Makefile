.PHONY: all clean dev build test lint

all: lint test build

clean:
	rm -rf dist node_modules/.vite

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint
