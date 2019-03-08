FROM node:11.10.1-alpine

WORKDIR /var/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000
CMD [ "npm", "start" ]
