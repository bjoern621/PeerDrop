#!/bin/sh
set -e

check_env_var() {
    eval value=\$$1
    if [ -z "$value" ]; then
        echo "ERROR: Required environment variable $1 is not set"
        exit 1
    fi
}

check_env_var "HTTP_SCHEME"
check_env_var "WS_SCHEME"
check_env_var "BACKEND_HOST"
check_env_var "BACKEND_PORT"

cat <<EOF > /www/html/envvars.json
{
    "backendUrl": "${HTTP_SCHEME}://${BACKEND_HOST}:${BACKEND_PORT}",
    "wsBackendUrl": "${WS_SCHEME}://${BACKEND_HOST}:${BACKEND_PORT}"
}
EOF

echo "Generated envvars.json: (these values are publicly accessible!)"
cat /www/html/envvars.json