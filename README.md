# Image Suggestion API 

A Node.js REST API for retrieving image suggestions for under-illustrated Wikipedia articles. 

## Quick Start

First, install all npm dependencies

```
npm install
```

To start up the server, simply run:

```
npm start
```

This starts an HTTP server listening on `localhost:8000`. There are several
routes you may query:

* `http://localhost:8000?doc`
* `http://localhost:8000?spec`
* `http://localhost:8000/_info/`
* `http://localhost:8000/image-suggestions/v0/{lang}/{wiki}/pages:`
* `http://localhost:8000/image-suggestions/v0/{lang}/{wiki}/pages/{title}:`

### Tests

Tests are written using the [mocha](https://mochajs.org/) framework. To run, simply execute:

```
npm test
```

To measure test coverage, we use the npm package [nyc](https://www.npmjs.com/package/nyc). To see how much test coverage you have, simply execute the command below and your test coverage results will be viewable by loading `./coverage/lcov-report/index.html` in your browser.

```
npm run-script coverage
```

### Deployments

The API is publicly accessible at https://image-suggestion-api.wmcloud.org. To deploy new versions of the API to the CloudVPS instance:

1. Request to become a maintainer for the `image-suggestion-api` project by reaching out to Bill Pirkle or Nikki Nikkhoui on the Platform Engineering Team. 

2. Login to the instance
	```
	ssh image-sugg-api.image-suggestion-api.eqiad1.wikimedia.cloud
	```
3. Pull the latest code on master:
	```
	cd image-suggestion-api
	git pull
	```

4. Stop and restart the app via `screen`
	```
	killall screen
	screen
	cd image-suggestion-api
	npm start
	```

### Docker
This project uses [Blubber](https://wikitech.wikimedia.org/wiki/Blubber) for local Docker development and CI.

To build and start the API inside a Docker container for local development, execute:
```
blubber .pipeline/blubber.yaml development | docker build --tag img-sugg-api --file - .
```
```
docker run -p 127.0.0.1:8000:8000 img-sugg-api
```

You can now reach the API on `localhost:8000`

### API Documentation

The API documentation adheres to [OpenAPI](https://swagger.io/specification/) standards and lives in `spec.yaml`. It is viewable at `https://image-suggestion-api.wmcloud.org/?doc`.
