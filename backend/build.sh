#!/usr/bin/env bash
set -e
pip install -r requirements.txt
curl -fsSL https://withcoral.com/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
