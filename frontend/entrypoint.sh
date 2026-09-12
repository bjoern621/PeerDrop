#!/bin/sh
set -e

. /envvars.sh

mkdir -p /etc/nginx/includes

envsubst '$WS_SCHEME $BACKEND_HOST $BACKEND_PORT' < /etc/nginx/templates/common-headers.conf.template > /etc/nginx/includes/common-headers.conf
envsubst '$WS_SCHEME $BACKEND_HOST $BACKEND_PORT' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

# The bootstrap scripts point the terminal client at this instance.
# Only the two names are substituted, so the shell syntax around them survives.
for script in /www/html/cli /www/html/cli.ps1; do
    envsubst '$HTTP_SCHEME $FRONTEND_DOMAIN' < "$script" > "$script.instance"
    mv "$script.instance" "$script"
done

exec nginx -g 'daemon off;'