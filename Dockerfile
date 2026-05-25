FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY spinwheel.html /usr/share/nginx/html/spinwheel.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
