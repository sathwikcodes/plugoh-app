#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <template-path> <image> <output-path>" >&2
  exit 1
fi

template_path="$1"
image="$2"
output_path="$3"

if [ ! -f "$template_path" ]; then
  echo "Template not found: $template_path" >&2
  exit 1
fi

if ! grep -q "__API_IMAGE__" "$template_path"; then
  echo "Template is missing the __API_IMAGE__ placeholder: $template_path" >&2
  exit 1
fi

sed "s|__API_IMAGE__|$image|g" "$template_path" > "$output_path"
