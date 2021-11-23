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

## Tests

Tests are written using the [mocha](https://mochajs.org/) framework. To run, simply execute:

```
npm test
```

To measure test coverage, we use the npm package [nyc](https://www.npmjs.com/package/nyc). To see how much test coverage you have, simply execute the command below and your test coverage results will be viewable by loading `./coverage/lcov-report/index.html` in your browser.

```
npm run-script coverage
```

## Deployments

The API is publicly accessible at https://image-suggestion-api.wmcloud.org. To deploy new versions of the API to the CloudVPS instance, you must first be a project admin. You can request access from any of the existing admins (Bill Pirkle, Nikki Nikkhoui, or Wendy Quarshie)

### Data Refresh

The Image Suggestion API uses a static sqlite database file, `/static/database.db` to serve data. On startup, if `database.db` does not already exist, the API generates a new database file from all `.tsv` files in the `/static` directory. If the data ever needs to be refreshed, a new `database.db` must be generated. To do so:

1. Replace any existing files under `/static` directory with the new `.tsv` file(s).
2. Start the server with `npm start` to begin the database file generation.
* This may take awhile based on how large your files are/the amount of CPU and memory on your laptop. The API will log its progress as it continues.
3. Execute the below to copy the new file to the production instance, where {username} is your horizon.wikimedia.org username.
```
scp static/database.db {username}@image-sugg-api.image-suggestion-api.eqiad1.wikimedia.cloud:/home/{username}/image-suggestion-api/static/databasenew.db
```

4. Restart the systemctl service
```
	sudo systemctl restart image-suggestion-api
```

### Source code changes

If you just need to deploy a new version of the API due to source code changes:

1. Login to the instance
	```
	ssh image-sugg-api.image-suggestion-api.eqiad1.wikimedia.cloud
	```
2. Pull the latest code on master:
	```
	cd image-suggestion-api
	git pull
	```

3. Restart the systemctl service
	The API exists as a systemctl service. Restart the API to see your changes.
	```
	sudo systemctl restart image-suggestion-api
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
