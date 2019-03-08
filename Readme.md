# Node web app example using a Redis session store

This projects acts as an example for the DBII lecture at the DHBW Stuttgart. It
shows the capabilities of Redis as a session store for multiple applications.

## :rocket: Running the project
1. Setup Docker on your machine.
2. Run `docker-compose up` inside the project folder.
3. Visit [Host 1](http://localhost:8000) and [Host 2](http://localhost:80001)
   to see the magic happen :sparkles:.

Docker allocates ports `8000`and `8001` by default. Make sure that they are both
available.
