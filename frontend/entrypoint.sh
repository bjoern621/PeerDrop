#!/bin/sh
set -e

. /envvars.sh

mkdir -p /etc/nginx/includes

envsubst '$WS_SCHEME $BACKEND_HOST $BACKEND_PORT' < /etc/nginx/templates/common-headers.conf.template > /etc/nginx/includes/common-headers.conf
envsubst '$WS_SCHEME $BACKEND_HOST $BACKEND_PORT' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'