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

The API is publicly accessible at image-suggestion-api.toolforge.org. To deploy new versions of the API to the toolforge instance:

1. Request to become a maintainer for `image-suggestion-api` on `toolsadmin.wikimedia.org`.
2. Login to the toolforge instance and become the tool account
	```
	ssh login.toolforge.org
	```
	```
	become image-suggestion-api
	```

3. Pull the latest code:
	```
	cd /www/js/
	```
	```
	git pull
	```

4. Restart the service
	```
	webservice --backend=kubernetes node10 restart
	```

### API Documentation

The API documentation adheres to [OpenAPI](https://swagger.io/specification/) standards and lives in `spec.yaml`. It is viewable at `https://image-suggestion-api.toolforge.org/?doc`.

