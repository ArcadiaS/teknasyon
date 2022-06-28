FROM node:lts-alpine3.11
ARG PORT
WORKDIR /usr/src/app
COPY package*.json ./
RUN if [ "$NODE_ENV" = "production" ] ; then npm ci ; else npm install ; fi
RUN rm -f .npmrc
COPY . .
RUN npm run build
RUN npm install pg --save
EXPOSE ${PORT}
CMD [ "npm", "start"]